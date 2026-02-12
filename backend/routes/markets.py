"""Market routes — list, create, close, settle markets."""

from datetime import datetime

from database import (
    Bet,
    BetStatus,
    BettingType,
    Market,
    MarketStatus,
    Selection,
    User,
    get_db,
)
from deps import (
    build_selection_response,
    calculate_parimutuel_odds,
    log_activity,
    require_admin,
)
from fastapi import APIRouter, Depends, HTTPException
from schemas import MarketCreate, MarketResponse, MarketSettle
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/markets", tags=["markets"])


def _market_to_response(market: Market, db: Session) -> MarketResponse:
    """Convert a Market ORM object to a MarketResponse."""
    total_staked = sum(s.pool_total for s in market.selections)
    house_cut = market.house_cut or 0.10
    pool_after_cut = total_staked * (1 - house_cut)

    parimutuel_data = None
    if market.betting_type == BettingType.PARIMUTUEL:
        parimutuel_data = calculate_parimutuel_odds(market, db)

    selections = [build_selection_response(s, market, parimutuel_data) for s in market.selections]

    return MarketResponse(
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


@router.get("", response_model=list[MarketResponse])
async def list_markets(status: MarketStatus | None = None, db: Session = Depends(get_db)):
    """List all markets, optionally filtered by status."""
    query = db.query(Market)
    if status:
        query = query.filter(Market.status == status)
    markets = query.order_by(Market.created_at.desc()).all()
    return [_market_to_response(m, db) for m in markets]


@router.get("/{market_id}", response_model=MarketResponse)
async def get_market(market_id: int, db: Session = Depends(get_db)):
    """Get a specific market."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return _market_to_response(market, db)


@router.post("", response_model=MarketResponse)
async def create_market(
    data: MarketCreate, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Create a new betting market (admin only)."""
    market = Market(
        name=data.name,
        description=data.description,
        market_type=data.market_type,
        betting_type=data.betting_type,
        house_cut=data.house_cut,
        closes_at=data.closes_at,
    )
    db.add(market)
    db.flush()

    for sel in data.selections:
        selection = Selection(market_id=market.id, name=sel.name, odds=sel.odds, pool_total=0.0)
        db.add(selection)

    db.commit()
    db.refresh(market)

    betting_type_str = (
        "Pool (dynamic odds)" if data.betting_type == BettingType.PARIMUTUEL else "Fixed odds"
    )
    await log_activity(
        db,
        "market_created",
        f"New market: {market.name} ({betting_type_str})",
        user_id=user.id,
        data={
            "market_id": market.id,
            "market_name": market.name,
            "betting_type": data.betting_type.value,
        },
    )

    return _market_to_response(market, db)


@router.put("/{market_id}/close")
async def close_market(
    market_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Close a market (no more bets allowed)."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    market.status = MarketStatus.CLOSED
    db.commit()

    await log_activity(
        db, "market_closed", f"Market closed: {market.name}", data={"market_id": market.id}
    )
    return {"message": "Market closed"}


@router.put("/{market_id}/settle")
async def settle_market(
    market_id: int,
    data: MarketSettle,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Settle a market with a winning selection."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    winning_selection = (
        db.query(Selection)
        .filter(Selection.id == data.winning_selection_id, Selection.market_id == market_id)
        .first()
    )
    if not winning_selection:
        raise HTTPException(status_code=400, detail="Invalid winning selection")

    winning_selection.is_winner = True
    market.status = MarketStatus.SETTLED
    market.settled_at = datetime.utcnow()

    bets = (
        db.query(Bet)
        .filter(
            Bet.selection_id.in_([s.id for s in market.selections]), Bet.status == BetStatus.ACTIVE
        )
        .all()
    )

    winners = []
    total_payout = 0

    if market.betting_type == BettingType.PARIMUTUEL:
        total_pool = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_pool * (1 - house_cut)
        winning_pool = winning_selection.pool_total
        final_odds = pool_after_cut / winning_pool if winning_pool > 0 else 0

        for bet in bets:
            if bet.selection_id == winning_selection.id:
                actual_payout = bet.stake * final_odds
                bet.status = BetStatus.WON
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = actual_payout
                bet.user.balance += actual_payout
                winners.append(bet)
                total_payout += actual_payout
            else:
                bet.status = BetStatus.LOST
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = 0

        house_profit = total_pool * house_cut
    else:
        for bet in bets:
            if bet.selection_id == winning_selection.id:
                bet.status = BetStatus.WON
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = bet.potential_win
                bet.user.balance += bet.potential_win
                winners.append(bet)
                total_payout += bet.potential_win
            else:
                bet.status = BetStatus.LOST
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = 0

        house_profit = sum(s.pool_total for s in market.selections) - total_payout

    db.commit()

    payout_type = "pool" if market.betting_type == BettingType.PARIMUTUEL else "fixed"
    await log_activity(
        db,
        "market_settled",
        f"{market.name} settled! Winner: {winning_selection.name} ({payout_type} payout)",
        data={
            "market_id": market.id,
            "winner": winning_selection.name,
            "total_winners": len(winners),
            "total_payout": round(total_payout, 2),
            "house_profit": round(house_profit, 2),
            "betting_type": market.betting_type.value,
        },
    )

    return {
        "message": f"Market settled. {len(winners)} winning bets paid out.",
        "total_payout": round(total_payout, 2),
        "house_profit": round(house_profit, 2),
    }
