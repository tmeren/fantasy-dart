"""Admin routes — enter results, ratings, odds, liability, prop markets, match stats."""

from datetime import datetime

from database import (
    Bet,
    BetStatus,
    BettingType,
    Market,
    MarketStatus,
    Selection,
    User,
    WhatsAppLog,
    get_db,
)
from deps import (
    build_selection_response,
    calculate_parimutuel_odds,
    log_activity,
    require_admin,
)
from elo_engine import get_elo_ratings, get_sorted_ratings
from fastapi import APIRouter, Depends, HTTPException
from match_data import get_scheduled_matches, invalidate_cache, write_match_result
from odds_engine import get_outright_odds
from prop_odds_calculator import get_all_prop_markets
from schemas import (
    EnterResultRequest,
    EnterResultResponse,
    GeneratePropMarketsRequest,
    LiabilityMarket,
    LiabilitySelection,
    MarketResponse,
    MatchStatsResponse,
    OutrightOddsEntry,
    PlayerRatingResponse,
    PropMarketPreview,
    ScheduledMatchResponse,
    UpdateMatchStats,
    WhatsAppLogResponse,
)
from sqlalchemy.orm import Session
from whatsapp_client import whatsapp_client

router = APIRouter(prefix="/api", tags=["admin"])


# ---- Admin Tournament ----


@router.get("/admin/scheduled-matches", response_model=list[ScheduledMatchResponse])
async def admin_scheduled_matches(user: User = Depends(require_admin)):
    """Get all scheduled (unplayed) matches from the tournament CSV."""
    invalidate_cache()
    sched = get_scheduled_matches()
    return [
        ScheduledMatchResponse(
            round=m["round"], match_id=m["match_id"], player1=m["player1"], player2=m["player2"]
        )
        for m in sched
    ]


@router.post("/admin/enter-result", response_model=EnterResultResponse)
async def admin_enter_result(
    data: EnterResultRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Enter a match result: updates CSV, recalculates Elo and odds."""
    if data.score1 == 3 and data.score2 in (0, 1, 2):
        pass
    elif data.score2 == 3 and data.score1 in (0, 1, 2):
        pass
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid score: one player must have 3, other must have 0-2",
        )

    try:
        write_match_result(
            data.match_id,
            data.score1,
            data.score2,
            data.winner,
            total_180s=data.total_180s,
            highest_checkout=data.highest_checkout,
            p1_180=data.p1_180,
            p2_180=data.p2_180,
            p1_ton_checkout=data.p1_ton_checkout,
            p2_ton_checkout=data.p2_ton_checkout,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    _settle_prop_markets(db, data)

    ratings = get_elo_ratings()
    sorted_ratings = get_sorted_ratings(ratings)

    rating_list = [
        PlayerRatingResponse(
            rank=i,
            player=name,
            elo=round(elo, 1),
            wins=ratings[name].wins,
            losses=ratings[name].losses,
            draws=ratings[name].draws,
            games_played=ratings[name].games_played,
        )
        for i, (name, elo) in enumerate(sorted_ratings, 1)
        if ratings[name].games_played > 0
    ]

    sched = get_scheduled_matches()
    outright = get_outright_odds(ratings, sched)

    odds_list = [
        OutrightOddsEntry(
            player=o["player"],
            true_probability=o["true_probability"],
            implied_probability=o["implied_probability"],
            odds=o["odds"],
            top8_pct=o["top8_pct"],
        )
        for o in outright
    ]

    _refresh_market_elo_odds(db, ratings, sched)

    await log_activity(
        db,
        "match_result",
        f"Match M{data.match_id} result: {data.winner} wins ({data.score1}-{data.score2})",
        user_id=user.id,
        data={
            "match_id": data.match_id,
            "winner": data.winner,
            "score": f"{data.score1}-{data.score2}",
        },
    )

    return EnterResultResponse(
        message="Result entered. Elo ratings and odds updated.",
        match_id=data.match_id,
        winner=data.winner,
        score=f"{data.score1}-{data.score2}",
        updated_ratings=rating_list,
        updated_outright_odds=odds_list,
    )


def _refresh_market_elo_odds(db: Session, ratings: dict, sched: list[dict]):
    """Update Selection.odds for open markets with fresh Elo-derived odds."""
    from odds_engine import get_match_odds as compute_match_odds

    outright = get_outright_odds(ratings, sched)
    outright_odds_map = {o["player"]: o["odds"] for o in outright}

    match_odds_list = compute_match_odds(ratings, sched)
    match_odds_map = {}
    for mo in match_odds_list:
        match_odds_map[(mo["player1"], mo["player2"])] = (mo["odds1"], mo["odds2"])

    outright_markets = (
        db.query(Market)
        .filter(Market.market_type == "outright", Market.status == MarketStatus.OPEN)
        .all()
    )
    for market in outright_markets:
        for sel in market.selections:
            if sel.name in outright_odds_map:
                sel.odds = outright_odds_map[sel.name]

    match_markets = (
        db.query(Market)
        .filter(Market.market_type == "match", Market.status == MarketStatus.OPEN)
        .all()
    )
    for market in match_markets:
        if len(market.selections) == 2:
            p1_name = market.selections[0].name
            p2_name = market.selections[1].name
            key = (p1_name, p2_name)
            rev_key = (p2_name, p1_name)
            if key in match_odds_map:
                market.selections[0].odds = match_odds_map[key][0]
                market.selections[1].odds = match_odds_map[key][1]
            elif rev_key in match_odds_map:
                market.selections[0].odds = match_odds_map[rev_key][1]
                market.selections[1].odds = match_odds_map[rev_key][0]

    db.commit()


def _settle_prop_markets(db: Session, data):
    """Auto-settle prop markets based on match result data (S9)."""
    from database import Match as MatchModel
    from prop_odds_calculator import short_name

    match_row = db.query(MatchModel).filter(MatchModel.match_id == data.match_id).first()
    if not match_row:
        return

    sn1 = short_name(match_row.player1)
    sn2 = short_name(match_row.player2)
    total_legs = data.score1 + data.score2

    prop_markets = (
        db.query(Market)
        .filter(Market.market_type == "prop", Market.status == MarketStatus.OPEN)
        .all()
    )

    settled_count = 0
    for market in prop_markets:
        if sn1 not in market.name and sn2 not in market.name:
            continue

        winner_name = None

        if "Total 180s" in market.name:
            if data.total_180s is not None:
                winner_name = "Over 2.5" if data.total_180s > 2.5 else "Under 2.5"
        elif "Total Legs" in market.name:
            winner_name = "Over 4.5" if total_legs > 4.5 else "Under 4.5"
        elif "Highest Checkout" in market.name:
            if data.highest_checkout is not None:
                winner_name = "Over 80.5" if data.highest_checkout > 80.5 else "Under 80.5"
        elif "to hit a 180" in market.name:
            if sn1 in market.name:
                winner_name = "Yes" if data.p1_180 else "No"
            elif sn2 in market.name:
                winner_name = "Yes" if data.p2_180 else "No"
        elif "First Leg Winner" in market.name:
            winner_name = short_name(data.winner)
        elif "Exact Score" in market.name:
            score_str = (
                f"{short_name(data.winner)} {data.score1}-{data.score2}"
                if data.winner == match_row.player1
                else f"{short_name(data.winner)} {data.score2}-{data.score1}"
            )
            winner_name = score_str
        elif "100+ checkout" in market.name:
            if sn1 in market.name:
                winner_name = "Yes" if data.p1_ton_checkout else "No"
            elif sn2 in market.name:
                winner_name = "Yes" if data.p2_ton_checkout else "No"

        if winner_name is None:
            continue

        winning_sel = None
        for sel in market.selections:
            if sel.name == winner_name:
                winning_sel = sel
                break

        if winning_sel is None:
            continue

        winning_sel.is_winner = True
        market.status = MarketStatus.SETTLED
        market.settled_at = datetime.utcnow()

        bets = (
            db.query(Bet)
            .filter(
                Bet.selection_id.in_([s.id for s in market.selections]),
                Bet.status == BetStatus.ACTIVE,
            )
            .all()
        )

        total_pool = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_pool * (1 - house_cut)
        winning_pool = winning_sel.pool_total
        final_odds = pool_after_cut / winning_pool if winning_pool > 0 else 0

        for bet in bets:
            if bet.selection_id == winning_sel.id:
                actual_payout = bet.stake * final_odds
                bet.status = BetStatus.WON
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = actual_payout
                bet.user.balance += actual_payout
            else:
                bet.status = BetStatus.LOST
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = 0

        settled_count += 1

    if settled_count > 0:
        db.commit()


# ---- Admin Ratings & Odds ----


@router.get("/admin/current-ratings", response_model=list[PlayerRatingResponse])
async def admin_current_ratings(user: User = Depends(require_admin)):
    """Get current Elo ratings for all players."""
    invalidate_cache()
    ratings = get_elo_ratings()
    sorted_ratings = get_sorted_ratings(ratings)
    return [
        PlayerRatingResponse(
            rank=i,
            player=name,
            elo=round(elo, 1),
            wins=ratings[name].wins,
            losses=ratings[name].losses,
            draws=ratings[name].draws,
            games_played=ratings[name].games_played,
        )
        for i, (name, elo) in enumerate(sorted_ratings, 1)
        if ratings[name].games_played > 0
    ]


@router.get("/admin/current-odds", response_model=list[OutrightOddsEntry])
async def admin_current_odds(user: User = Depends(require_admin)):
    """Get current outright tournament winner odds (Monte Carlo)."""
    invalidate_cache()
    ratings = get_elo_ratings()
    sched = get_scheduled_matches()
    outright = get_outright_odds(ratings, sched)
    return [
        OutrightOddsEntry(
            player=o["player"],
            true_probability=o["true_probability"],
            implied_probability=o["implied_probability"],
            odds=o["odds"],
            top8_pct=o["top8_pct"],
        )
        for o in outright
    ]


@router.get("/admin/liability", response_model=list[LiabilityMarket])
async def admin_liability(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get liability report for all open markets."""
    markets = db.query(Market).filter(Market.status == MarketStatus.OPEN).all()
    result = []

    for market in markets:
        total_pool = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_pool * (1 - house_cut)

        max_payout = 0.0
        sel_liabilities = []
        for sel in market.selections:
            if sel.pool_total > 0:
                payout_if_wins = pool_after_cut
                liability = payout_if_wins - sel.pool_total
            else:
                payout_if_wins = 0.0
                liability = 0.0

            sel_liabilities.append(
                LiabilitySelection(
                    selection=sel.name,
                    pool=round(sel.pool_total, 2),
                    payout_if_wins=round(payout_if_wins, 2),
                    net_liability=round(liability, 2),
                )
            )
            max_payout = max(max_payout, payout_if_wins)

        result.append(
            LiabilityMarket(
                market=market.name,
                total_pool=round(total_pool, 2),
                house_revenue=round(total_pool * house_cut, 2),
                max_payout=round(max_payout, 2),
                selections=sel_liabilities,
            )
        )

    return result


# ---- Prop Markets (S7) ----


@router.get("/prop-markets", response_model=list[MarketResponse])
async def list_prop_markets(
    match_id: int | None = None,
    status: MarketStatus | None = None,
    db: Session = Depends(get_db),
):
    """List prop markets from the database, optionally filtered by match_id and status."""
    query = db.query(Market).filter(Market.market_type == "prop")

    if status:
        query = query.filter(Market.status == status)

    if match_id:
        from database import Match as MatchModel
        from prop_odds_calculator import short_name

        match_row = db.query(MatchModel).filter(MatchModel.match_id == match_id).first()
        if match_row:
            sn1 = short_name(match_row.player1)
            sn2 = short_name(match_row.player2)
            query = query.filter(Market.name.contains(sn1) | Market.name.contains(sn2))

    markets = query.order_by(Market.created_at.desc()).all()

    result = []
    for market in markets:
        total_staked = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_staked * (1 - house_cut)

        parimutuel_data = None
        if market.betting_type == BettingType.PARIMUTUEL:
            parimutuel_data = calculate_parimutuel_odds(market, db)

        selections = [
            build_selection_response(s, market, parimutuel_data) for s in market.selections
        ]

        result.append(
            MarketResponse(
                id=market.id,
                name=market.name,
                description=market.description,
                market_type=market.market_type,
                betting_type=market.betting_type,
                house_cut=market.house_cut,
                status=market.status,
                created_at=market.created_at,
                closes_at=market.closes_at,
                selections=selections,
                total_staked=total_staked,
                pool_after_cut=pool_after_cut,
            )
        )

    return result


@router.get("/prop-markets/preview/{match_id}", response_model=list[PropMarketPreview])
async def preview_prop_markets(match_id: int):
    """Preview prop markets for a match using the calculator (no DB write)."""
    from database import Match as MatchModel, SessionLocal

    db = SessionLocal()
    try:
        match_row = db.query(MatchModel).filter(MatchModel.match_id == match_id).first()
    finally:
        db.close()

    if not match_row:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
    if match_row.status == "Completed":
        raise HTTPException(status_code=400, detail="Match already completed")

    invalidate_cache()
    ratings = get_elo_ratings()

    match_dict = {
        "player1": match_row.player1,
        "player2": match_row.player2,
        "round": match_row.round,
        "match_id": match_row.match_id,
    }

    prop_markets = get_all_prop_markets(ratings, match_dict)
    return prop_markets


@router.post("/admin/prop-markets/generate", response_model=list[MarketResponse])
async def generate_prop_markets(
    data: GeneratePropMarketsRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Generate and persist all 9 prop markets for a match (admin only)."""
    from database import Match as MatchModel

    match_row = db.query(MatchModel).filter(MatchModel.match_id == data.match_id).first()
    if not match_row:
        raise HTTPException(status_code=404, detail=f"Match {data.match_id} not found")
    if match_row.status == "Completed":
        raise HTTPException(status_code=400, detail="Match already completed")

    invalidate_cache()
    ratings = get_elo_ratings()

    match_dict = {
        "player1": match_row.player1,
        "player2": match_row.player2,
        "round": match_row.round,
        "match_id": match_row.match_id,
    }

    prop_markets = get_all_prop_markets(ratings, match_dict)

    created_ids = []
    for pm in prop_markets:
        market = Market(
            name=pm["name"],
            description=pm["description"],
            market_type="prop",
            betting_type=BettingType.PARIMUTUEL,
            house_cut=0.10,
        )
        db.add(market)
        db.flush()

        for sel in pm["selections"]:
            selection = Selection(
                market_id=market.id, name=sel["name"], odds=sel["odds"], pool_total=0.0
            )
            db.add(selection)

        created_ids.append(market.id)

    db.commit()

    await log_activity(
        db,
        "prop_markets_created",
        f"9 prop markets created for Match M{data.match_id}: "
        f"{match_row.player1} vs {match_row.player2}",
        user_id=user.id,
        data={"match_id": data.match_id, "market_count": len(created_ids)},
    )

    from routes.markets import _market_to_response

    return [_market_to_response(db.query(Market).get(mid), db) for mid in created_ids]


# ---- Match Stats (S9) ----


@router.put("/admin/match-stats/{match_id}", response_model=MatchStatsResponse)
async def update_match_stats(
    match_id: int,
    data: UpdateMatchStats,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update prop data collection fields for a match (admin only)."""
    from database import Match as MatchModel

    match_row = db.query(MatchModel).filter(MatchModel.match_id == match_id).first()
    if not match_row:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")

    if data.total_180s is not None:
        match_row.total_180s = data.total_180s
    if data.highest_checkout is not None:
        match_row.highest_checkout = data.highest_checkout
    if data.p1_180 is not None:
        match_row.p1_180 = data.p1_180
    if data.p2_180 is not None:
        match_row.p2_180 = data.p2_180
    if data.p1_ton_checkout is not None:
        match_row.p1_ton_checkout = data.p1_ton_checkout
    if data.p2_ton_checkout is not None:
        match_row.p2_ton_checkout = data.p2_ton_checkout

    db.commit()
    db.refresh(match_row)

    return MatchStatsResponse(
        match_id=match_row.match_id,
        player1=match_row.player1,
        player2=match_row.player2,
        total_180s=match_row.total_180s,
        highest_checkout=match_row.highest_checkout,
        p1_180=match_row.p1_180,
        p2_180=match_row.p2_180,
        p1_ton_checkout=match_row.p1_ton_checkout,
        p2_ton_checkout=match_row.p2_ton_checkout,
    )


@router.get("/tournament/match-stats/{match_id}", response_model=MatchStatsResponse)
async def get_match_stats(match_id: int):
    """Get prop data stats for a completed match (public)."""
    from database import Match as MatchModel, SessionLocal

    db = SessionLocal()
    try:
        match_row = db.query(MatchModel).filter(MatchModel.match_id == match_id).first()
    finally:
        db.close()

    if not match_row:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")

    return MatchStatsResponse(
        match_id=match_row.match_id,
        player1=match_row.player1,
        player2=match_row.player2,
        total_180s=match_row.total_180s,
        highest_checkout=match_row.highest_checkout,
        p1_180=match_row.p1_180,
        p2_180=match_row.p2_180,
        p1_ton_checkout=match_row.p1_ton_checkout,
        p2_ton_checkout=match_row.p2_ton_checkout,
    )


# ---- WhatsApp Admin ----


async def _send_whatsapp_to_opted_in(
    db: Session, template_name: str, message_type: str, admin_user: User
) -> dict:
    """Send a WhatsApp template to all opted-in users."""
    opted_in_users = (
        db.query(User).filter(User.whatsapp_opted_in.is_(True), User.phone_number.isnot(None)).all()
    )

    sent = 0
    failed = 0
    for u in opted_in_users:
        result = await whatsapp_client.send_template(u.phone_number, template_name)

        log = WhatsAppLog(
            user_id=u.id,
            message_type=message_type,
            template_name=template_name,
            status="sent" if result["success"] else "failed",
            meta_message_id=result.get("meta_message_id"),
        )
        db.add(log)

        if result["success"]:
            sent += 1
        else:
            failed += 1

    db.commit()

    await log_activity(
        db,
        "whatsapp_sent",
        f"WhatsApp {message_type}: {sent} sent, {failed} failed",
        user_id=admin_user.id,
        data={"template": template_name, "sent": sent, "failed": failed},
    )

    return {"message": f"{message_type} sent", "sent": sent, "failed": failed}


@router.post("/admin/whatsapp/send-match-day")
async def send_match_day_reminders(
    user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Send match day reminder to all opted-in users (admin only)."""
    return await _send_whatsapp_to_opted_in(db, "match_day_reminder", "match_day_reminder", user)


@router.post("/admin/whatsapp/send-results")
async def send_results_announcement(
    user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Send results announcement to all opted-in users (admin only)."""
    return await _send_whatsapp_to_opted_in(
        db, "results_announcement", "results_announcement", user
    )


@router.post("/admin/whatsapp/send-leaderboard")
async def send_weekly_leaderboard(
    user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Send weekly leaderboard to all opted-in users (admin only)."""
    return await _send_whatsapp_to_opted_in(db, "weekly_leaderboard", "weekly_leaderboard", user)


@router.post("/admin/whatsapp/send-quiz")
async def send_pub_quiz(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Send pub quiz poll to all opted-in users (admin only)."""
    return await _send_whatsapp_to_opted_in(db, "pub_quiz_poll", "pub_quiz_poll", user)



@router.get("/admin/whatsapp/logs", response_model=list[WhatsAppLogResponse])
async def get_whatsapp_logs(
    limit: int = 50,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get recent WhatsApp message logs (admin only)."""
    logs = db.query(WhatsAppLog).order_by(WhatsAppLog.created_at.desc()).limit(limit).all()
    return logs
