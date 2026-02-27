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
    hash_password,
    log_activity,
    require_admin,
)
from elo_engine import get_elo_ratings, get_sorted_ratings
from fastapi import APIRouter, Depends, HTTPException
from match_data import (
    correct_match_result,
    get_scheduled_matches,
    invalidate_cache,
    write_match_result,
)
from odds_engine import get_match_odds as compute_match_odds
from odds_engine import get_outright_odds
from prop_odds_calculator import get_all_prop_markets
from schemas import (
    CorrectResultRequest,
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


@router.post("/admin/reset-password")
async def admin_reset_password(
    email: str,
    new_password: str,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reset any user's password (admin only)."""
    target = db.query(User).filter(User.email == email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.password_hash = hash_password(new_password)
    db.commit()
    return {"message": f"Password reset for {target.name} ({target.email})"}


@router.post("/admin/clear-password")
async def admin_clear_password(
    email: str,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Clear a user's password so they set a new one on next login (admin only)."""
    target = db.query(User).filter(User.email == email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.password_hash = None
    db.commit()
    return {"message": f"Password cleared for {target.name}. They'll set a new one on next login."}


# ---- Admin Tournament ----


@router.get("/admin/scheduled-matches", response_model=list[ScheduledMatchResponse])
async def admin_scheduled_matches(user: User = Depends(require_admin)):
    """Get all scheduled (unplayed) matches from the tournament CSV."""
    sched = get_scheduled_matches()
    return [
        ScheduledMatchResponse(
            round=m["round"], match_id=m["match_id"], player1=m["player1"], player2=m["player2"]
        )
        for m in sched
    ]


@router.post("/admin/generate-match-markets")
async def generate_match_markets(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Auto-generate match markets for all scheduled matches that don't have one yet.

    Creates a PARIMUTUEL market per match with 2 selections (one per player),
    seeded with Elo-derived odds. Skips matches that already have an open/closed
    match market in the DB (matched by player names in selections).
    """
    from routes.markets import _market_to_response

    invalidate_cache()
    sched = get_scheduled_matches()
    ratings = get_elo_ratings()
    match_odds_list = compute_match_odds(ratings, sched)

    # Build odds lookup by match_id
    odds_by_match = {mo["match_id"]: mo for mo in match_odds_list}

    # Find existing match markets so we don't create duplicates
    existing_markets = (
        db.query(Market)
        .filter(
            Market.market_type == "match",
            Market.status.in_([MarketStatus.OPEN, MarketStatus.CLOSED]),
        )
        .all()
    )
    existing_pairs = set()
    for m in existing_markets:
        names = frozenset(s.name for s in m.selections)
        existing_pairs.add(names)

    created = []
    for match in sched:
        pair = frozenset([match["player1"], match["player2"]])
        if pair in existing_pairs:
            continue

        mo = odds_by_match.get(match["match_id"])
        odds1 = mo["odds1"] if mo else 2.0
        odds2 = mo["odds2"] if mo else 2.0

        market = Market(
            name=f"R{match['round']} M{match['match_id']}: {match['player1']} vs {match['player2']}",
            description=f"Round {match['round']} — Match {match['match_id']}",
            market_type="match",
            betting_type=BettingType.PARIMUTUEL,
            house_cut=0.10,
        )
        db.add(market)
        db.flush()

        db.add(Selection(market_id=market.id, name=match["player1"], odds=odds1, pool_total=0.0))
        db.add(Selection(market_id=market.id, name=match["player2"], odds=odds2, pool_total=0.0))
        created.append(market)

    db.commit()

    if created:
        await log_activity(
            db,
            "match_markets_created",
            f"{len(created)} match markets auto-generated for upcoming rounds",
            user_id=user.id,
            data={"count": len(created), "match_ids": [m.id for m in created]},
        )

    return {
        "message": f"{len(created)} match markets created ({len(sched) - len(created)} already existed)",
        "created": len(created),
        "skipped": len(sched) - len(created),
        "markets": [_market_to_response(m, db) for m in created],
    }


@router.post("/admin/generate-qf-markets")
async def generate_qf_markets(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Auto-generate quarterfinal match markets from the current playoff bracket.

    Creates a PARIMUTUEL market per QF matchup with 2 selections, seeded with
    knockout-adjusted odds from the Monte Carlo engine. Skips QFs that already
    have a matching open market.
    """
    from odds_engine import get_quarterfinal_matchup_odds
    from routes.markets import _market_to_response

    invalidate_cache()
    ratings = get_elo_ratings()
    sorted_ratings = sorted(ratings, key=lambda r: r["elo"], reverse=True)
    current_top8 = [r["player"] for r in sorted_ratings[:8]]

    qf_odds = get_quarterfinal_matchup_odds(ratings, current_top8)

    # Find existing match markets so we don't create duplicates
    existing_markets = (
        db.query(Market)
        .filter(
            Market.market_type == "match",
            Market.status.in_([MarketStatus.OPEN, MarketStatus.CLOSED]),
        )
        .all()
    )
    existing_pairs = set()
    for m in existing_markets:
        existing_pairs.add(frozenset(s.name for s in m.selections))

    created = []
    for i, qf in enumerate(qf_odds):
        pair = frozenset([qf["higher_seed"], qf["lower_seed"]])
        if pair in existing_pairs:
            continue

        def short(name: str) -> str:
            parts = name.split()
            return parts[0] if len(parts) > 1 else name

        seed_h = current_top8.index(qf["higher_seed"]) + 1
        seed_l = current_top8.index(qf["lower_seed"]) + 1
        market = Market(
            name=f"{qf['label']}: #{seed_h} {short(qf['higher_seed'])} vs #{seed_l} {short(qf['lower_seed'])}",
            description="Quarterfinal match winner. Pool betting — odds change with bets.",
            market_type="match",
            betting_type=BettingType.PARIMUTUEL,
            house_cut=0.10,
        )
        db.add(market)
        db.flush()

        db.add(Selection(market_id=market.id, name=qf["higher_seed"], odds=qf["odds_higher"], pool_total=0.0))
        db.add(Selection(market_id=market.id, name=qf["lower_seed"], odds=qf["odds_lower"], pool_total=0.0))
        created.append(market)

    db.commit()

    if created:
        await log_activity(
            db,
            "qf_markets_created",
            f"{len(created)} QF match markets auto-generated",
            user_id=user.id,
            data={"count": len(created), "market_ids": [m.id for m in created]},
        )

    return {
        "message": f"{len(created)} QF markets created ({len(qf_odds) - len(created)} already existed)",
        "created": len(created),
        "skipped": len(qf_odds) - len(created),
        "markets": [_market_to_response(m, db) for m in created],
    }


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

    await _settle_match_markets(db, data.match_id, data.winner)
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


@router.post("/admin/correct-result")
async def admin_correct_result(
    data: CorrectResultRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Correct an already-completed match result (admin only).

    Used for retroactive corrections like disqualification adjustments.
    Triggers full Elo recalc and odds refresh after correction.
    """
    try:
        correct_match_result(
            data.match_id,
            data.score1,
            data.score2,
            data.winner,
            is_draw=data.is_draw,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ratings = get_elo_ratings()
    sched = get_scheduled_matches()
    _refresh_market_elo_odds(db, ratings, sched)

    await log_activity(
        db,
        "match_correction",
        f"Match M{data.match_id} corrected: "
        + (
            f"{data.winner} wins ({data.score1}-{data.score2})"
            if data.winner
            else f"Draw ({data.score1}-{data.score2})"
        ),
        user_id=user.id,
        data={
            "match_id": data.match_id,
            "score1": data.score1,
            "score2": data.score2,
            "winner": data.winner,
            "is_draw": data.is_draw,
        },
    )

    return {
        "message": "Match corrected. Elo and odds recalculated.",
        "match_id": data.match_id,
        "score": f"{data.score1}-{data.score2}",
        "winner": data.winner,
        "is_draw": data.is_draw,
    }


@router.post("/admin/batch-correct")
async def admin_batch_correct(
    corrections: list[CorrectResultRequest],
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Apply multiple match corrections in one call, recalc Elo once at the end."""
    results = []
    for c in corrections:
        try:
            correct_match_result(
                c.match_id,
                c.score1,
                c.score2,
                c.winner,
                is_draw=c.is_draw,
            )
            results.append({"match_id": c.match_id, "status": "ok"})
        except ValueError as e:
            results.append({"match_id": c.match_id, "status": "error", "detail": str(e)})

    # Single Elo recalc + odds refresh after all corrections
    ratings = get_elo_ratings()
    sched = get_scheduled_matches()
    _refresh_market_elo_odds(db, ratings, sched)

    ok_count = sum(1 for r in results if r["status"] == "ok")
    await log_activity(
        db,
        "batch_correction",
        f"Batch corrected {ok_count}/{len(corrections)} matches",
        user_id=user.id,
    )

    return {
        "message": f"{ok_count}/{len(corrections)} corrected. Elo recalculated.",
        "results": results,
    }


def _refresh_market_elo_odds(db: Session, ratings: dict, sched: list[dict]):
    """Update Selection.odds for open markets with fresh Elo-derived odds.

    Also ensures all markets use PARIMUTUEL betting type (dynamic odds).
    """
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
        if market.betting_type != BettingType.PARIMUTUEL:
            market.betting_type = BettingType.PARIMUTUEL
        for sel in market.selections:
            if sel.name in outright_odds_map:
                sel.odds = outright_odds_map[sel.name]

    match_markets = (
        db.query(Market)
        .filter(Market.market_type == "match", Market.status == MarketStatus.OPEN)
        .all()
    )
    for market in match_markets:
        if market.betting_type != BettingType.PARIMUTUEL:
            market.betting_type = BettingType.PARIMUTUEL
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


async def _settle_match_markets(db: Session, match_id: int, winner: str):
    """Auto-settle match-type markets when a result is entered.

    Finds any open match market whose selections match the two players,
    then settles it using parimutuel (or fixed) payout logic.
    Logs settlement announcements to the live activity feed.
    """
    from database import Match as MatchModel

    match_row = db.query(MatchModel).filter(MatchModel.match_id == match_id).first()
    if not match_row:
        return

    p1 = match_row.player1
    p2 = match_row.player2

    match_markets = (
        db.query(Market)
        .filter(Market.market_type == "match", Market.status == MarketStatus.OPEN)
        .all()
    )

    for market in match_markets:
        sel_names = {s.name for s in market.selections}
        if p1 not in sel_names or p2 not in sel_names:
            continue

        winning_sel = None
        for sel in market.selections:
            if sel.name == winner:
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

        if market.betting_type == BettingType.PARIMUTUEL:
            total_pool = sum(s.pool_total for s in market.selections)
            house_cut = market.house_cut or 0.10
            pool_after_cut = total_pool * (1 - house_cut)
            winning_pool = winning_sel.pool_total
            final_odds = pool_after_cut / winning_pool if winning_pool > 0 else 0

            for bet in bets:
                if bet.selection_id == winning_sel.id:
                    actual_payout = round(bet.stake * final_odds, 2)
                    bet.status = BetStatus.WON
                    bet.settled_at = datetime.utcnow()
                    bet.actual_payout = actual_payout
                    bet.user.balance += actual_payout
                    profit = round(actual_payout - bet.stake, 2)
                    await log_activity(
                        db,
                        "bet_won",
                        f"{bet.user.name} won {actual_payout:.0f} RTB "
                        f"(+{profit:.0f} profit) on '{market.name}' — "
                        f"backed {winner} correctly!",
                        user_id=bet.user_id,
                        data={
                            "payout": actual_payout,
                            "stake": bet.stake,
                            "profit": profit,
                            "market": market.name,
                            "winner": winner,
                        },
                    )
                else:
                    bet.status = BetStatus.LOST
                    bet.settled_at = datetime.utcnow()
                    bet.actual_payout = 0
                    await log_activity(
                        db,
                        "bet_lost",
                        f"{bet.user.name} lost {bet.stake:.0f} RTB on '{market.name}' — "
                        f"{winner} won the match.",
                        user_id=bet.user_id,
                        data={
                            "stake": bet.stake,
                            "market": market.name,
                            "winner": winner,
                        },
                    )
        else:
            for bet in bets:
                if bet.selection_id == winning_sel.id:
                    bet.status = BetStatus.WON
                    bet.settled_at = datetime.utcnow()
                    bet.actual_payout = bet.potential_win
                    bet.user.balance += bet.potential_win
                    profit = round(bet.potential_win - bet.stake, 2)
                    await log_activity(
                        db,
                        "bet_won",
                        f"{bet.user.name} won {bet.potential_win:.0f} RTB "
                        f"(+{profit:.0f} profit) on '{market.name}' — "
                        f"backed {winner} correctly!",
                        user_id=bet.user_id,
                        data={
                            "payout": bet.potential_win,
                            "stake": bet.stake,
                            "profit": profit,
                            "market": market.name,
                            "winner": winner,
                        },
                    )
                else:
                    bet.status = BetStatus.LOST
                    bet.settled_at = datetime.utcnow()
                    bet.actual_payout = 0
                    await log_activity(
                        db,
                        "bet_lost",
                        f"{bet.user.name} lost {bet.stake:.0f} RTB on '{market.name}' — "
                        f"{winner} won the match.",
                        user_id=bet.user_id,
                        data={
                            "stake": bet.stake,
                            "market": market.name,
                            "winner": winner,
                        },
                    )

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
                actual_payout = round(bet.stake * final_odds, 2)
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
    from database import Match as MatchModel
    from database import SessionLocal

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
    from database import Match as MatchModel
    from database import SessionLocal

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


# ---- Season Management ----


@router.post("/admin/void-old-bets")
async def void_old_bets(
    cutoff_round: int = 35,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Void active bets on match/prop markets for rounds 1..cutoff_round.

    Surgical refund: each voided bet's stake is returned to the user's balance.
    Tournament winner (outright) bets are kept as-is.
    Bets on rounds after the cutoff are preserved for normal settlement.

    Each void is announced on the live activity feed.

    Query param:
        cutoff_round (default 35): void bets on matches in rounds 1..cutoff_round.
    """
    from database import Match as MatchModel
    from prop_odds_calculator import short_name

    # Build lookup structures for completed matches up to cutoff
    old_completed = (
        db.query(MatchModel)
        .filter(MatchModel.status == "Completed", MatchModel.round <= cutoff_round)
        .all()
    )
    old_player_pairs = {frozenset((m.player1, m.player2)) for m in old_completed}
    # Map frozenset pair → round number for announcement context
    pair_to_round = {frozenset((m.player1, m.player2)): m.round for m in old_completed}
    # Build short-name pairs for prop market matching
    old_short_pairs = {
        frozenset((short_name(m.player1), short_name(m.player2))): m.round for m in old_completed
    }

    # Find all unsettled markets (open or closed but not yet settled)
    unsettled_markets = (
        db.query(Market).filter(Market.status.in_([MarketStatus.OPEN, MarketStatus.CLOSED])).all()
    )

    voided_count = 0
    refunded_total = 0.0
    markets_closed = 0
    # Track per-user refunds for individual announcements
    user_refunds: dict[int, list[dict]] = {}

    for market in unsettled_markets:
        matched_round = None

        if market.market_type == "match":
            sel_names = frozenset(s.name for s in market.selections)
            if sel_names in old_player_pairs:
                matched_round = pair_to_round[sel_names]
        elif market.market_type == "prop":
            # Prop market names contain short player names (e.g. "Ali C.")
            # Check if both short names of any old-match pair appear in the name
            for pair, rnd in old_short_pairs.items():
                sn_list = list(pair)
                if len(sn_list) == 2 and sn_list[0] in market.name and sn_list[1] in market.name:
                    matched_round = rnd
                    break
        # outright (tournament winner) markets: SKIP — keep as-is

        if matched_round is None:
            continue

        # Void all active bets on this market and refund stakes
        active_bets = (
            db.query(Bet)
            .filter(
                Bet.selection_id.in_([s.id for s in market.selections]),
                Bet.status == BetStatus.ACTIVE,
            )
            .all()
        )

        for bet in active_bets:
            bet.status = BetStatus.VOID
            bet.settled_at = datetime.utcnow()
            bet.actual_payout = bet.stake  # Full refund
            if bet.user:
                bet.user.balance += bet.stake
                uid = bet.user.id
                if uid not in user_refunds:
                    user_refunds[uid] = []
                user_refunds[uid].append(
                    {
                        "user_name": bet.user.name,
                        "stake": bet.stake,
                        "selection": bet.selection.name if bet.selection else "Unknown",
                        "market": market.name,
                        "round": matched_round,
                    }
                )
            voided_count += 1
            refunded_total += bet.stake

        market.status = MarketStatus.SETTLED
        market.settled_at = datetime.utcnow()
        markets_closed += 1

    db.commit()

    # Log individual refund announcements per user on the live feed
    for uid, refunds in user_refunds.items():
        user_name = refunds[0]["user_name"]
        total_refund = sum(r["stake"] for r in refunds)
        bet_details = "; ".join(
            f"{r['stake']:.0f} RTB on '{r['selection']}' ({r['market']}, Round {r['round']})"
            for r in refunds
        )
        await log_activity(
            db,
            "bet_voided_refund",
            f"Refund: {user_name} received {total_refund:.0f} RTB back. "
            f"Voided bets: {bet_details}. "
            f"These were past matches (Rounds 1-{cutoff_round}) that should not have been "
            f"open for betting. Full stakes refunded.",
            user_id=uid,
            data={
                "user_name": user_name,
                "refunded_total": round(total_refund, 2),
                "bet_count": len(refunds),
                "details": refunds,
            },
        )

    # Summary announcement
    await log_activity(
        db,
        "season_cleanup",
        f"Season cleanup complete: {voided_count} bets voided across {markets_closed} markets "
        f"for Rounds 1-{cutoff_round}. Total {refunded_total:.0f} RTB refunded to "
        f"{len(user_refunds)} players. These markets were for past matches that should not "
        f"have remained open. Tournament winner bets are unaffected.",
        user_id=user.id,
        data={
            "voided_count": voided_count,
            "refunded_total": round(refunded_total, 2),
            "markets_closed": markets_closed,
            "users_affected": len(user_refunds),
        },
    )

    return {
        "message": f"Voided {voided_count} bets, refunded {refunded_total:.0f} RTB, "
        f"closed {markets_closed} markets, {len(user_refunds)} players refunded",
        "voided_count": voided_count,
        "refunded_total": round(refunded_total, 2),
        "markets_closed": markets_closed,
        "users_affected": len(user_refunds),
    }


@router.get("/admin/user-balances")
async def get_user_balances(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all user balances for audit purposes (admin only)."""
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.balance.desc()).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "balance": round(u.balance, 2)}
        for u in users
    ]


@router.post("/admin/close-all-markets")
async def close_all_open_markets(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Close all open markets (no more bets allowed). Admin only."""
    open_markets = db.query(Market).filter(Market.status == MarketStatus.OPEN).all()
    closed_count = 0
    for market in open_markets:
        market.status = MarketStatus.CLOSED
        closed_count += 1

    db.commit()

    await log_activity(
        db,
        "all_markets_closed",
        f"All {closed_count} open markets closed",
        user_id=user.id,
        data={"closed_count": closed_count},
    )

    return {"message": f"Closed {closed_count} open markets", "closed_count": closed_count}


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
