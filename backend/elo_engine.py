"""Elo rating engine for Fantasy Darts Tournament.

Implements a darts-specific Elo system based on deep research:
- K=32 base with dynamic adjustments
- Games-played decay: K multiplier 1.5 -> 0.75 over 30 matches
- Phase weighting: early rounds 1.1x, mid 1.0x, late 0.9x
- Margin-of-victory multiplier: 3-0 (1.30), 3-1 (1.10), 3-2 (0.85)
- Draws: no Elo change

Reference: docs/ELO_K_FACTOR_RESEARCH.md
"""

import math
from dataclasses import dataclass, field

from match_data import (
    ALL_PLAYERS,
    completed_matches,
    get_standings,
)

# --- Constants ---

INITIAL_ELO = 1500.0
K_BASE = 32

# Games-played decay: multiplier decreases from 1.5 to 0.75 over 30 games
DECAY_START = 1.5
DECAY_END = 0.75
DECAY_GAMES = 30

# Phase weighting by round number
PHASE_EARLY_END = 10  # Rounds 1-10: early round-robin
PHASE_MID_END = 20  # Rounds 11-20: mid round-robin
# Rounds 21-38: late round-robin
PHASE_WEIGHT_EARLY = 1.1
PHASE_WEIGHT_MID = 1.0
PHASE_WEIGHT_LATE = 0.9

# Margin-of-victory multipliers
MOV_MULTIPLIERS: dict[tuple[int, int], float] = {
    (3, 0): 1.30,
    (3, 1): 1.10,
    (3, 2): 0.85,
    (0, 3): 1.30,
    (1, 3): 1.10,
    (2, 3): 0.85,
}
MOV_DEFAULT = 1.0  # For unusual scores like 2-1


@dataclass
class PlayerRating:
    name: str
    elo: float = INITIAL_ELO
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    elo_history: list[tuple[int, float]] = field(default_factory=list)

    def record_snapshot(self, match_id: int):
        """Record current Elo after a match."""
        self.elo_history.append((match_id, self.elo))


def games_played_decay(n: int) -> float:
    """Calculate K-factor multiplier based on games played.

    Linear decay from DECAY_START (1.5) to DECAY_END (0.75) over DECAY_GAMES (30).
    Clamped at DECAY_END after 30 games.
    """
    if n >= DECAY_GAMES:
        return DECAY_END
    return DECAY_START + (DECAY_END - DECAY_START) * (n / DECAY_GAMES)


def phase_weight(round_num: int) -> float:
    """Get phase weight multiplier for a given round."""
    if round_num <= PHASE_EARLY_END:
        return PHASE_WEIGHT_EARLY
    elif round_num <= PHASE_MID_END:
        return PHASE_WEIGHT_MID
    else:
        return PHASE_WEIGHT_LATE


def mov_multiplier(score_w: int, score_l: int) -> float:
    """Get margin-of-victory multiplier for a match score.

    Uses winner's score first, loser's score second.
    """
    key = (score_w, score_l)
    return MOV_MULTIPLIERS.get(key, MOV_DEFAULT)


def expected_score(elo_a: float, elo_b: float) -> float:
    """Calculate expected score (win probability) for player A."""
    return 1.0 / (1.0 + math.pow(10, (elo_b - elo_a) / 400.0))


def effective_k(player: PlayerRating, round_num: int) -> float:
    """Calculate effective K-factor for a player in a given round.

    K_eff = K_BASE * games_played_decay(n) * phase_weight(round)
    """
    return K_BASE * games_played_decay(player.games_played) * phase_weight(round_num)


def update_elo(
    winner: PlayerRating,
    loser: PlayerRating,
    winner_score: int,
    loser_score: int,
    round_num: int,
    match_id: int,
):
    """Update Elo ratings after a completed match.

    Does NOT handle draws — those should be skipped before calling this.
    """
    # Expected scores
    e_winner = expected_score(winner.elo, loser.elo)
    e_loser = 1.0 - e_winner

    # K-factors for each player
    k_winner = effective_k(winner, round_num)
    k_loser = effective_k(loser, round_num)

    # Margin of victory multiplier
    mov = mov_multiplier(winner_score, loser_score)

    # Update ratings: winner scored 1.0, loser scored 0.0
    winner.elo += k_winner * mov * (1.0 - e_winner)
    loser.elo += k_loser * mov * (0.0 - e_loser)

    # Update records
    winner.games_played += 1
    winner.wins += 1
    loser.games_played += 1
    loser.losses += 1

    # Record snapshots
    winner.record_snapshot(match_id)
    loser.record_snapshot(match_id)


def process_matches(matches: list[dict]) -> dict[str, PlayerRating]:
    """Process a list of completed matches and return final ratings.

    Matches must be sorted by match_id (chronological order).
    """
    ratings: dict[str, PlayerRating] = {name: PlayerRating(name=name) for name in ALL_PLAYERS}

    for m in matches:
        if m["is_draw"]:
            # No Elo change for draws, but record the game
            p1 = ratings[m["player1"]]
            p2 = ratings[m["player2"]]
            p1.games_played += 1
            p1.draws += 1
            p2.games_played += 1
            p2.draws += 1
            p1.record_snapshot(m["match_id"])
            p2.record_snapshot(m["match_id"])
            continue

        if m["winner"] is None:
            continue  # Skip if no winner determined

        winner_name = m["winner"]
        loser_name = m["player2"] if m["player1"] == winner_name else m["player1"]

        winner_score = m["score1"] if m["player1"] == winner_name else m["score2"]
        loser_score = m["score2"] if m["player1"] == winner_name else m["score1"]

        update_elo(
            ratings[winner_name],
            ratings[loser_name],
            winner_score,
            loser_score,
            m["round"],
            m["match_id"],
        )

    return ratings


def get_elo_ratings() -> dict[str, PlayerRating]:
    """Get current Elo ratings based on all completed matches."""
    return process_matches(completed_matches())


def run_backtest() -> dict:
    """Backtest prediction accuracy: did higher-Elo player win?

    For each completed match, predict the winner from current Elo
    BEFORE updating, then check if prediction was correct.

    Returns:
        dict with accuracy stats
    """
    ratings: dict[str, PlayerRating] = {name: PlayerRating(name=name) for name in ALL_PLAYERS}

    correct = 0
    total = 0
    wrong_predictions = []

    for m in completed_matches():
        if m["is_draw"]:
            p1 = ratings[m["player1"]]
            p2 = ratings[m["player2"]]
            p1.games_played += 1
            p1.draws += 1
            p2.games_played += 1
            p2.draws += 1
            p1.record_snapshot(m["match_id"])
            p2.record_snapshot(m["match_id"])
            continue

        if m["winner"] is None:
            continue

        p1 = ratings[m["player1"]]
        p2 = ratings[m["player2"]]

        # Predict: higher Elo player wins
        # Skip first few matches where everyone is at 1500
        if p1.games_played >= 2 and p2.games_played >= 2:
            predicted_winner = m["player1"] if p1.elo >= p2.elo else m["player2"]
            actual_winner = m["winner"]
            total += 1
            if predicted_winner == actual_winner:
                correct += 1
            else:
                wrong_predictions.append(
                    {
                        "match_id": m["match_id"],
                        "predicted": predicted_winner,
                        "actual": actual_winner,
                        "p1_elo": round(p1.elo, 1),
                        "p2_elo": round(p2.elo, 1),
                    }
                )

        # Now update Elo
        winner_name = m["winner"]
        loser_name = m["player2"] if m["player1"] == winner_name else m["player1"]
        winner_score = m["score1"] if m["player1"] == winner_name else m["score2"]
        loser_score = m["score2"] if m["player1"] == winner_name else m["score1"]

        update_elo(
            ratings[winner_name],
            ratings[loser_name],
            winner_score,
            loser_score,
            m["round"],
            m["match_id"],
        )

    accuracy = correct / total if total > 0 else 0.0
    return {
        "correct": correct,
        "total": total,
        "accuracy": accuracy,
        "accuracy_pct": round(accuracy * 100, 1),
        "wrong_count": len(wrong_predictions),
    }


def print_standings(ratings: dict[str, PlayerRating]):
    """Print all 20 players sorted by Elo descending."""
    sorted_players = sorted(ratings.values(), key=lambda p: -p.elo)

    print(f"\n{'='*75}")
    print(f"{'Rank':<5} {'Player':<25} {'Elo':>7} {'W':>4} {'L':>4} {'D':>3} {'GP':>4}")
    print(f"{'='*75}")

    for i, p in enumerate(sorted_players, 1):
        print(
            f"{i:<5} {p.name:<25} {p.elo:>7.1f} {p.wins:>4} {p.losses:>4} "
            f"{p.draws:>3} {p.games_played:>4}"
        )


def get_sorted_ratings(ratings: dict[str, PlayerRating]) -> list[tuple[str, float]]:
    """Return sorted list of (player_name, elo) tuples by Elo descending."""
    return sorted(
        [(p.name, p.elo) for p in ratings.values()],
        key=lambda x: -x[1],
    )


if __name__ == "__main__":
    print("Fantasy Darts Elo Engine")
    print("=" * 40)

    # Run full Elo calculation
    ratings = get_elo_ratings()
    print_standings(ratings)

    # Run backtest
    print("\n" + "=" * 40)
    print("BACKTEST RESULTS")
    print("=" * 40)
    bt = run_backtest()
    print(f"Predictions tested: {bt['total']}")
    print(f"Correct: {bt['correct']}")
    print(f"Wrong: {bt['wrong_count']}")
    print(f"Accuracy: {bt['accuracy_pct']}%")

    # Compare Elo rankings vs actual standings
    print("\n" + "=" * 40)
    print("ELO vs ACTUAL STANDINGS COMPARISON")
    print("=" * 40)
    actual = get_standings()
    elo_sorted = get_sorted_ratings(ratings)

    print(f"{'Rank':<5} {'Elo Player':<25} {'Elo':>7}  |  {'Actual Player':<25} {'W-L'}")
    print("-" * 80)
    for i, ((elo_name, elo_val), act) in enumerate(zip(elo_sorted, actual), 1):
        wl = f"{act['wins']}-{act['losses']}"
        marker = " <<" if elo_name != act["player"] else ""
        print(f"{i:<5} {elo_name:<25} {elo_val:>7.1f}  |  {act['player']:<25} {wl}{marker}")
