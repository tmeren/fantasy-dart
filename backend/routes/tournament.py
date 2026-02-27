"""Tournament routes — standings, ratings, results, upcoming matches, playoff bracket."""

from elo_engine import get_elo_ratings, get_sorted_ratings
from fastapi import APIRouter
from match_data import completed_matches, get_scheduled_matches, get_standings
from odds_engine import get_match_odds, get_outright_odds, get_quarterfinal_matchup_odds
from schemas import (
    CompletedMatchResponse,
    ContenderEntry,
    OutrightOddsEntry,
    PlayerRatingResponse,
    PlayoffBracketResponse,
    PlayoffPlayerEntry,
    QuarterfinalMatchup,
    RemainingMatchOdds,
    ScheduledMatchResponse,
    StandingEntry,
)

router = APIRouter(prefix="/api/tournament", tags=["tournament"])

# Cached outright odds — only recomputed when invalidate_outright_cache() is called
_outright_cache: list[dict] | None = None


def invalidate_outright_cache():
    """Clear the outright odds cache. Called when match results change."""
    global _outright_cache
    _outright_cache = None


def _get_cached_outright(ratings, sched):
    """Return cached outright odds, computing only if cache is empty."""
    global _outright_cache
    if _outright_cache is None:
        _outright_cache = get_outright_odds(ratings, sched)
    return _outright_cache


@router.get("/standings", response_model=list[StandingEntry])
async def tournament_standings():
    """Get current tournament standings (W-L-D, legs, leg diff)."""
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
            score=r["wins"] * 3 + r["draws"],
        )
        for i, r in enumerate(standings, 1)
    ]


@router.get("/ratings", response_model=list[PlayerRatingResponse])
async def tournament_ratings():
    """Get current Elo ratings for all active players (public)."""
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


@router.get("/playoff-bracket", response_model=PlayoffBracketResponse)
async def tournament_playoff_bracket():
    """Get playoff bracket data: top 8, QF matchups with odds, contenders, outright odds."""
    ratings = get_elo_ratings()
    sched = get_scheduled_matches()

    # Build standings to get top 8 by score (wins*3), then leg diff
    standings = get_standings()

    # Top 8 players (by standings order)
    top8_standings = standings[:8]
    top8_names = [s["player"] for s in top8_standings]

    top8_entries = []
    for i, s in enumerate(top8_standings, 1):
        r = ratings.get(s["player"])
        top8_entries.append(
            PlayoffPlayerEntry(
                rank=i,
                player=s["player"],
                elo=round(r.elo if r else 1500, 1),
                wins=s["wins"],
                losses=s["losses"],
                draws=s["draws"],
                games_played=s["played"],
                score=s["wins"] * 3,
            )
        )

    # QF matchups from odds_engine
    qf_matchups = get_quarterfinal_matchup_odds(ratings, top8_names)
    qf_entries = [
        QuarterfinalMatchup(
            label=qf["label"],
            higher_seed=qf["higher_seed"],
            lower_seed=qf["lower_seed"],
            elo_higher=qf["elo_higher"],
            elo_lower=qf["elo_lower"],
            odds_higher=qf["odds_higher"],
            odds_lower=qf["odds_lower"],
        )
        for qf in qf_matchups
    ]

    # Contenders: players ranked 9-12 with their top8 qualification %
    outright = _get_cached_outright(ratings, sched)
    outright_by_player = {o["player"]: o for o in outright}

    contender_entries = []
    for s in standings[8 : min(12, len(standings))]:
        o = outright_by_player.get(s["player"], {})
        r = ratings.get(s["player"])
        contender_entries.append(
            ContenderEntry(
                rank=standings.index(s) + 1,
                player=s["player"],
                elo=round(r.elo if r else 1500, 1),
                top8_pct=o.get("top8_pct", 0),
            )
        )

    # Outright tournament winner odds — only current top 8, sorted by odds asc
    outright_entries = sorted(
        [
            OutrightOddsEntry(
                player=o["player"],
                true_probability=o["true_probability"],
                implied_probability=o["implied_probability"],
                odds=o["odds"],
                top8_pct=o["top8_pct"],
            )
            for o in outright
            if o["player"] in top8_names
        ],
        key=lambda e: e.odds,
    )

    return PlayoffBracketResponse(
        top8=top8_entries,
        quarterfinals=qf_entries,
        contenders=contender_entries,
        outright_odds=outright_entries,
    )


@router.get("/remaining-matches", response_model=list[RemainingMatchOdds])
async def tournament_remaining_matches():
    """Get all remaining scheduled matches with Elo-derived odds."""
    ratings = get_elo_ratings()
    sched = get_scheduled_matches()
    match_odds = get_match_odds(ratings, sched)

    return [
        RemainingMatchOdds(
            match_id=int(mo["match_id"]),
            round=int(mo["round"]),
            player1=mo["player1"],
            player2=mo["player2"],
            elo1=mo["elo1"],
            elo2=mo["elo2"],
            odds1=mo["odds1"],
            odds2=mo["odds2"],
        )
        for mo in match_odds
    ]
