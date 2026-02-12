"""Tournament match data for Fantasy Darts Betting.

Primary source: PostgreSQL database (persists across deploys).
Seed source: data/tournament_database.csv (loaded once on first deploy).
"""

import csv
import os

# Path to tournament data (relative to this file's directory)
# Check for data in same directory first (Railway deployment), then parent (monorepo)
_here = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(_here, "data")
if not os.path.isdir(DATA_DIR):
    DATA_DIR = os.path.join(_here, "..", "data")
CSV_PATH = os.path.join(DATA_DIR, "tournament_database.csv")

# All 20 tournament players - full name to short key mapping
PLAYER_KEY_MAP: dict[str, str] = {
    "Ali Celik": "ALI_CELIK",
    "Alican Donerkaya": "ALICAN",
    "Ata Kemal Yukselen": "ATA_KEMAL",
    "Baran Yildiz": "BARAN",
    "Berkay Alpagot": "BERKAY",
    "Busra Caliskan": "BUSRA",
    "Ece Saritepe": "ECE",
    "Ekin Isik": "EKIN",
    "Emre Ozorhan": "EMRE",
    "Erkut Yaltkaya": "ERKUT",
    "Havva Ozkan": "HAVVA",
    "Mehmet Ovali": "MEHMET",
    "Muzaffer Akin": "MUZAFFER",
    "Nurten Yilmaz": "NURTEN",
    "Okan Duman": "OKAN",
    "Seckin Civan": "SECKIN",
    "Selda Yesiltas": "SELDA",
    "Veli Metli": "VELI",
    "Yasar Ulucan": "YASAR",
    "Yusuf Cura": "YUSUF",
}

# Reverse mapping: short key to full name
KEY_TO_NAME: dict[str, str] = {v: k for k, v in PLAYER_KEY_MAP.items()}

# All player full names (sorted)
ALL_PLAYERS: list[str] = sorted(PLAYER_KEY_MAP.keys())


def _clean_header(header: str) -> str:
    """Clean markdown-escaped header names (e.g., Match\\_ID -> Match_ID)."""
    return header.replace("\\_", "_").strip()


def parse_tournament_csv(filepath: str = CSV_PATH) -> list[dict]:
    """Parse the tournament database CSV file into a list of match dicts.

    Each match dict has:
        round: int
        match_id: int
        player1: str (full name)
        player2: str (full name)
        score1: int or None (None for scheduled)
        score2: int or None (None for scheduled)
        status: str ("Completed" or "Scheduled")
        winner: str or None (full name, "Draw", or None for scheduled)
        is_draw: bool
    """
    matches = []

    with open(filepath, encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # Skip header row

        for row in reader:
            # Skip blank lines (markdown formatting creates empty rows)
            if not row or all(cell.strip() == "" for cell in row):
                continue

            # Parse fields
            round_num = int(row[0].strip())
            match_id = int(row[1].strip())
            player1 = row[2].strip()
            player2 = row[3].strip()
            score1_raw = row[4].strip()
            score2_raw = row[5].strip()
            status = row[6].strip()
            winner_raw = row[7].strip() if len(row) > 7 else ""

            # Parse scores (empty for scheduled matches)
            score1: int | None = int(score1_raw) if score1_raw else None
            score2: int | None = int(score2_raw) if score2_raw else None

            # Determine winner and draw status
            is_draw = winner_raw == "Draw"
            winner: str | None = None
            if status == "Completed" and not is_draw:
                winner = winner_raw if winner_raw else None
            elif is_draw:
                winner = None  # No winner in a draw

            matches.append(
                {
                    "round": round_num,
                    "match_id": match_id,
                    "player1": player1,
                    "player2": player2,
                    "score1": score1,
                    "score2": score2,
                    "status": status,
                    "winner": winner,
                    "is_draw": is_draw,
                }
            )

    return matches


# ---------------------------------------------------------------------------
# Database-backed accessors (replace CSV read/write for persistence)
# ---------------------------------------------------------------------------


def _match_row_to_dict(row) -> dict:
    """Convert an ORM Match row to the dict format all consumers expect."""
    return {
        "round": row.round,
        "match_id": row.match_id,
        "player1": row.player1,
        "player2": row.player2,
        "score1": row.score1,
        "score2": row.score2,
        "status": row.status,
        "winner": row.winner,
        "is_draw": row.is_draw,
    }


def _load_from_db() -> list[dict]:
    """Query all matches from the database, return list of dicts."""
    from database import Match, SessionLocal

    db = SessionLocal()
    try:
        rows = db.query(Match).order_by(Match.match_id).all()
        return [_match_row_to_dict(r) for r in rows]
    finally:
        db.close()


def seed_matches_from_csv(filepath: str = CSV_PATH):
    """Load CSV into the matches table if it is empty (idempotent).

    Called once on first deploy. Subsequent deploys skip because rows exist.
    """
    from database import Match, SessionLocal

    db = SessionLocal()
    try:
        count = db.query(Match).count()
        if count > 0:
            return  # Already seeded

        csv_matches = parse_tournament_csv(filepath)
        for m in csv_matches:
            db.add(
                Match(
                    round=m["round"],
                    match_id=m["match_id"],
                    player1=m["player1"],
                    player2=m["player2"],
                    score1=m["score1"],
                    score2=m["score2"],
                    status=m["status"],
                    winner=m["winner"],
                    is_draw=m["is_draw"],
                )
            )
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Derived helpers (unchanged signatures — consumers need zero changes)
# ---------------------------------------------------------------------------


def get_completed_matches(matches: list[dict] | None = None) -> list[dict]:
    """Return only completed matches, sorted by match_id."""
    if matches is None:
        matches = _load_from_db()
    return sorted(
        [m for m in matches if m["status"] == "Completed"],
        key=lambda m: m["match_id"],
    )


def get_scheduled_matches(matches: list[dict] | None = None) -> list[dict]:
    """Return only scheduled matches, sorted by match_id."""
    if matches is None:
        matches = _load_from_db()
    return sorted(
        [m for m in matches if m["status"] == "Scheduled"],
        key=lambda m: m["match_id"],
    )


def get_player_record(player: str, completed: list[dict] | None = None) -> dict:
    """Get W-L-D record and points differential for a player."""
    if completed is None:
        completed = get_completed_matches()

    wins = 0
    losses = 0
    draws = 0
    legs_for = 0
    legs_against = 0
    games_played = 0

    for m in completed:
        if m["player1"] == player:
            games_played += 1
            legs_for += m["score1"] or 0
            legs_against += m["score2"] or 0
            if m["is_draw"]:
                draws += 1
            elif m["winner"] == player:
                wins += 1
            else:
                losses += 1
        elif m["player2"] == player:
            games_played += 1
            legs_for += m["score2"] or 0
            legs_against += m["score1"] or 0
            if m["is_draw"]:
                draws += 1
            elif m["winner"] == player:
                wins += 1
            else:
                losses += 1

    return {
        "player": player,
        "played": games_played,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "legs_for": legs_for,
        "legs_against": legs_against,
        "leg_diff": legs_for - legs_against,
    }


def get_standings(completed: list[dict] | None = None) -> list[dict]:
    """Get full tournament standings sorted by wins (desc), then leg diff (desc)."""
    if completed is None:
        completed = get_completed_matches()

    records = [get_player_record(p, completed) for p in ALL_PLAYERS]
    records.sort(key=lambda r: (-r["wins"], -r["leg_diff"], -r["legs_for"]))
    return records


# ---------------------------------------------------------------------------
# Module-level cache (cleared on every write so next read is fresh from DB)
# ---------------------------------------------------------------------------

_all_matches: list[dict] | None = None
_completed: list[dict] | None = None
_scheduled: list[dict] | None = None


def _ensure_loaded():
    global _all_matches, _completed, _scheduled
    if _all_matches is None:
        _all_matches = _load_from_db()
        _completed = get_completed_matches(_all_matches)
        _scheduled = get_scheduled_matches(_all_matches)


def invalidate_cache():
    """Clear cached data so next access re-reads from DB."""
    global _all_matches, _completed, _scheduled
    _all_matches = None
    _completed = None
    _scheduled = None


def write_match_result(
    match_id: int, score1: int, score2: int, winner: str, **_kwargs
):
    """Write a match result to the database.

    Finds the row with matching match_id, updates scores/status/winner,
    then invalidates the module cache.

    Raises ValueError if match not found or already completed.
    """
    from database import Match, SessionLocal

    db = SessionLocal()
    try:
        row = db.query(Match).filter(Match.match_id == match_id).first()
        if row is None:
            raise ValueError(f"Match {match_id} not found in database")
        if row.status == "Completed":
            raise ValueError(f"Match {match_id} is already completed")
        if winner not in (row.player1, row.player2):
            raise ValueError(
                f"Winner '{winner}' must be one of: '{row.player1}' or '{row.player2}'"
            )

        row.score1 = score1
        row.score2 = score2
        row.status = "Completed"
        row.winner = winner
        row.is_draw = score1 == score2
        db.commit()
    finally:
        db.close()

    invalidate_cache()


# ---------------------------------------------------------------------------
# Convenience accessors (unchanged signatures)
# ---------------------------------------------------------------------------


def all_matches() -> list[dict]:
    _ensure_loaded()
    return _all_matches


def completed_matches() -> list[dict]:
    _ensure_loaded()
    return _completed


def scheduled_matches() -> list[dict]:
    _ensure_loaded()
    return _scheduled


if __name__ == "__main__":
    _ensure_loaded()
    print(f"Tournament Database loaded from DB")
    print(f"Total matches: {len(_all_matches)}")
    print(f"Completed: {len(_completed)}")
    print(f"Scheduled: {len(_scheduled)}")

    # Check for special cases
    draws = [m for m in _completed if m["is_draw"]]
    print(f"Draws: {len(draws)}")
    for d in draws:
        print(
            f"  Match {d['match_id']}: {d['player1']} vs {d['player2']} "
            f"({d['score1']}-{d['score2']})"
        )

    # Print standings
    print(f"\n{'='*70}")
    print(
        f"{'Rank':<5} {'Player':<25} {'P':>3} {'W':>3} {'L':>3} {'D':>3} "
        f"{'LF':>4} {'LA':>4} {'Diff':>5}"
    )
    print(f"{'='*70}")

    standings = get_standings(_completed)
    for i, r in enumerate(standings, 1):
        print(
            f"{i:<5} {r['player']:<25} {r['played']:>3} {r['wins']:>3} "
            f"{r['losses']:>3} {r['draws']:>3} {r['legs_for']:>4} "
            f"{r['legs_against']:>4} {r['leg_diff']:>+5}"
        )
