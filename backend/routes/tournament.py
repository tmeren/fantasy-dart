"""Tournament routes — standings, ratings, results, upcoming matches."""

from elo_engine import get_elo_ratings, get_sorted_ratings
from fastapi import APIRouter
from match_data import completed_matches, get_scheduled_matches, get_standings, invalidate_cache
from schemas import (
    CompletedMatchResponse,
    PlayerRatingResponse,
    ScheduledMatchResponse,
    StandingEntry,
)

router = APIRouter(prefix="/api/tournament", tags=["tournament"])


@router.get("/standings", response_model=list[StandingEntry])
async def tournament_standings():
    """Get current tournament standings (W-L-D, legs, leg diff)."""
    invalidate_cache()
    standings = get_standings()
    return [
        StandingEntry(
            rank=i,
            player=r["player"],
            played=r["played"],
            wins=r["wins"],
            losses=r["losses"],
            draws=r["draws"],
            legs_for=r["legs_for"],
            legs_against=r["legs_against"],
            leg_diff=r["leg_diff"],
        )
        for i, r in enumerate(standings, 1)
    ]


@router.get("/ratings", response_model=list[PlayerRatingResponse])
async def tournament_ratings():
    """Get current Elo ratings for all active players (public)."""
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


@router.get("/results", response_model=list[CompletedMatchResponse])
async def tournament_results():
    """Get all completed match results, most recent first."""
    invalidate_cache()
    matches = completed_matches()
    return [
        CompletedMatchResponse(
            round=m["round"],
            match_id=m["match_id"],
            player1=m["player1"],
            player2=m["player2"],
            score1=m["score1"],
            score2=m["score2"],
            winner=m["winner"],
            is_draw=m["is_draw"],
        )
        for m in reversed(matches)
    ]


@router.get("/upcoming", response_model=list[ScheduledMatchResponse])
async def tournament_upcoming():
    """Get all upcoming scheduled matches, ordered by round and match_id."""
    invalidate_cache()
    sched = get_scheduled_matches()
    return [
        ScheduledMatchResponse(
            round=m["round"],
            match_id=m["match_id"],
            player1=m["player1"],
            player2=m["player2"],
        )
        for m in sched
    ]
