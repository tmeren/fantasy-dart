"""Leaderboard routes — rankings, balance history."""

from database import Bet, BetStatus, User, get_db
from deps import STARTING_BALANCE
from fastapi import APIRouter, Depends, HTTPException
from schemas import BalanceHistoryEntry, LeaderboardEntry, UserPublic
from sqlalchemy import case, func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
async def get_leaderboard(db: Session = Depends(get_db)):
    """Get leaderboard sorted by token balance — single aggregate query."""
    stats = (
        db.query(
            User.id,
            User.name,
            User.balance,
            func.count(Bet.id).label("total_bets"),
            func.sum(case((Bet.status == BetStatus.WON, 1), else_=0)).label("won_bets"),
            func.coalesce(func.sum(Bet.stake), 0).label("total_staked"),
        )
        .outerjoin(Bet, Bet.user_id == User.id)
        .filter(User.is_active.is_(True))
        .group_by(User.id)
        .order_by(User.balance.desc())
        .all()
    )

    settled_bets = (
        db.query(Bet.user_id, Bet.status, Bet.stake, Bet.created_at)
        .filter(Bet.status.in_([BetStatus.WON, BetStatus.LOST]))
        .order_by(Bet.created_at.desc())
        .all()
    )

    user_settled: dict[int, list] = {}
    for b in settled_bets:
        user_settled.setdefault(b.user_id, []).append(b)

    result = []
    for rank, row in enumerate(stats, 1):
        uid, name, balance, total_bets, won_bets, total_staked = row
        won_bets = won_bets or 0
        total_staked = float(total_staked or 0)
        profit = round(balance - STARTING_BALANCE, 2)
        win_rate = round((won_bets / total_bets * 100) if total_bets > 0 else 0, 1)
        roi_pct = round((profit / total_staked * 100) if total_staked > 0 else 0, 1)

        streak = ""
        user_bets = user_settled.get(uid, [])
        if user_bets:
            first_status = user_bets[0].status
            count = 0
            for b in user_bets:
                if b.status == first_status:
                    count += 1
                else:
                    break
            if count >= 2:
                streak = f"{'W' if first_status == BetStatus.WON else 'L'}{count}"

        badges: list[str] = []
        if total_bets >= 1:
            badges.append("first_blood")
        max_stake = max((b.stake for b in user_bets), default=0)
        if max_stake >= 20:
            badges.append("high_roller")
        consec_wins = 0
        max_consec = 0
        for b in reversed(user_bets):
            if b.status == BetStatus.WON:
                consec_wins += 1
                max_consec = max(max_consec, consec_wins)
            else:
                consec_wins = 0
        if max_consec >= 3:
            badges.append("lucky_streak")
        if total_staked >= 500:
            badges.append("whale")
        if win_rate >= 60 and total_bets >= 10:
            badges.append("sharp")

        result.append(
            LeaderboardEntry(
                rank=rank,
                user=UserPublic(id=uid, name=name, balance=balance),
                total_bets=total_bets,
                win_rate=win_rate,
                profit=profit,
                roi_pct=roi_pct,
                total_staked=round(total_staked, 2),
                streak=streak,
                badges=badges,
            )
        )

    return result


@router.get("/{user_id}/history", response_model=list[BalanceHistoryEntry])
async def get_balance_history(user_id: int, db: Session = Depends(get_db)):
    """Get balance history for a user, derived from bet settlement timestamps."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    history: list[BalanceHistoryEntry] = [
        BalanceHistoryEntry(timestamp=user.created_at, balance=STARTING_BALANCE, event="joined")
    ]

    bets = db.query(Bet).filter(Bet.user_id == user_id).order_by(Bet.created_at.asc()).all()

    running_balance = STARTING_BALANCE
    for bet in bets:
        running_balance -= bet.stake
        history.append(
            BalanceHistoryEntry(
                timestamp=bet.created_at, balance=round(running_balance, 2), event="bet_placed"
            )
        )
        if bet.status == BetStatus.WON:
            payout = bet.actual_payout if bet.actual_payout else bet.potential_win
            running_balance += payout
            history.append(
                BalanceHistoryEntry(
                    timestamp=bet.settled_at or bet.created_at,
                    balance=round(running_balance, 2),
                    event="won",
                )
            )
        elif bet.status == BetStatus.LOST:
            history.append(
                BalanceHistoryEntry(
                    timestamp=bet.settled_at or bet.created_at,
                    balance=round(running_balance, 2),
                    event="lost",
                )
            )

    return history
