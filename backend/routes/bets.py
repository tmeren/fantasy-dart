"""Bet routes — place bets, view bets."""

from database import (
    Bet,
    BetStatus,
    BettingType,
    MarketStatus,
    Selection,
    User,
    get_db,
)
from deps import calculate_parimutuel_odds, log_activity, require_user
from fastapi import APIRouter, Depends, HTTPException
from schemas import BetCreate, BetPublic, BetResponse
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/bets", tags=["bets"])


@router.post("", response_model=BetResponse)
async def place_bet(
    data: BetCreate, user: User = Depends(require_user), db: Session = Depends(get_db)
):
    """Place a bet on a selection."""
    if data.stake <= 0:
        raise HTTPException(status_code=400, detail="Stake must be positive")
    if data.stake > user.balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    selection = db.query(Selection).filter(Selection.id == data.selection_id).first()
    if not selection:
        raise HTTPException(status_code=404, detail="Selection not found")

    market = selection.market
    if market.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open for betting")

    user.balance -= data.stake
    selection.pool_total += data.stake
    db.flush()

    if market.betting_type == BettingType.PARIMUTUEL:
        parimutuel_data = calculate_parimutuel_odds(market, db)
        current_odds = parimutuel_data.get(selection.id, {}).get("odds", selection.odds)
        potential_win = data.stake * current_odds
        is_parimutuel = True
    else:
        current_odds = selection.odds
        potential_win = data.stake * current_odds
        is_parimutuel = False

    bet = Bet(
        user_id=user.id,
        selection_id=selection.id,
        stake=data.stake,
        odds_at_time=current_odds,
        potential_win=potential_win,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)

    odds_type = "est." if is_parimutuel else ""
    await log_activity(
        db,
        "bet_placed",
        f"{user.name} predicted {selection.name} with {data.stake} RTB @ {odds_type}{current_odds:.2f}",
        user_id=user.id,
        data={
            "bet_id": bet.id,
            "user_name": user.name,
            "selection": selection.name,
            "market": market.name,
            "stake": data.stake,
            "odds": current_odds,
            "potential_win": potential_win,
            "is_parimutuel": is_parimutuel,
        },
    )

    return BetResponse(
        id=bet.id,
        user_id=user.id,
        user_name=user.name,
        selection_id=selection.id,
        selection_name=selection.name,
        market_name=market.name,
        stake=bet.stake,
        odds_at_time=bet.odds_at_time,
        potential_win=bet.potential_win,
        is_parimutuel=is_parimutuel,
        status=bet.status,
        created_at=bet.created_at,
    )


@router.get("/my", response_model=list[BetResponse])
async def get_my_bets(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Get current user's bets."""
    bets = db.query(Bet).filter(Bet.user_id == user.id).order_by(Bet.created_at.desc()).all()

    result = []
    for bet in bets:
        market = bet.selection.market
        is_parimutuel = market.betting_type == BettingType.PARIMUTUEL

        if is_parimutuel and bet.status == BetStatus.ACTIVE:
            parimutuel_data = calculate_parimutuel_odds(market, db)
            current_odds = parimutuel_data.get(bet.selection_id, {}).get("odds", bet.odds_at_time)
            current_potential = bet.stake * current_odds
        else:
            current_potential = bet.actual_payout if bet.actual_payout else bet.potential_win

        result.append(
            BetResponse(
                id=bet.id,
                user_id=user.id,
                user_name=user.name,
                selection_id=bet.selection_id,
                selection_name=bet.selection.name,
                market_name=market.name,
                stake=bet.stake,
                odds_at_time=bet.odds_at_time,
                potential_win=current_potential,
                actual_payout=bet.actual_payout,
                is_parimutuel=is_parimutuel,
                status=bet.status,
                created_at=bet.created_at,
            )
        )

    return result


@router.get("/all", response_model=list[BetPublic])
async def get_all_bets(db: Session = Depends(get_db)):
    """Get all bets (public view for social feed)."""
    bets = db.query(Bet).order_by(Bet.created_at.desc()).limit(50).all()

    result = []
    for bet in bets:
        market = bet.selection.market
        is_parimutuel = market.betting_type == BettingType.PARIMUTUEL

        if is_parimutuel and bet.status == BetStatus.ACTIVE:
            parimutuel_data = calculate_parimutuel_odds(market, db)
            current_odds = parimutuel_data.get(bet.selection_id, {}).get("odds", bet.odds_at_time)
            current_potential = bet.stake * current_odds
        else:
            current_potential = bet.actual_payout if bet.actual_payout else bet.potential_win

        result.append(
            BetPublic(
                id=bet.id,
                user_name=bet.user.name,
                selection_name=bet.selection.name,
                market_name=market.name,
                stake=bet.stake,
                odds_at_time=bet.odds_at_time,
                potential_win=current_potential,
                is_parimutuel=is_parimutuel,
                created_at=bet.created_at,
            )
        )

    return result
