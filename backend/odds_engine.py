"""Odds engine for Fantasy Darts Tournament.

Generates match odds and outright tournament winner odds using:
- Elo-based win probabilities
- Monte Carlo simulation for outright market
- Power method overround at 108%
- Knockout stage adjustments (shrinkage, choking, fatigue)

References:
    docs/OVERROUND_RESEARCH_REPORT.md
    docs/KNOCKOUT_ADJUSTMENT_RESEARCH.md
    docs/ELO_K_FACTOR_RESEARCH.md
"""

import random
from collections import defaultdict

from elo_engine import (
    INITIAL_ELO,
    PlayerRating,
    expected_score,
    get_elo_ratings,
    get_sorted_ratings,
)
from match_data import (
    ALL_PLAYERS,
    get_standings,
    scheduled_matches,
)

# --- Overround Constants ---

TARGET_OVERROUND_MATCH = 1.08  # 108% for head-to-head markets
TARGET_OVERROUND_OUTRIGHT = 1.08  # 108% for 8-player outright market

# --- Knockout Constants ---

KNOCKOUT_ALPHA = 0.70  # Shrinkage toward 50%
CHOKING_PENALTY = 0.02  # 2pp penalty for favorite
THROW_ORDER_BONUS = 0.03  # 3pp bonus for higher seed (throws first)
FATIGUE_FACTORS = {
    "QF": 1.00,
    "SF": 0.97,
    "Final": 0.93,
}

# --- Monte Carlo ---

MC_ITERATIONS = 10000
RANDOM_SEED = 42  # Reproducible results


def apply_power_overround(true_probs: list[float], target_overround: float = 1.08) -> list[float]:
    """Apply Power method overround to true probabilities.

    Solves for k such that sum(p_i^(1/k)) = target_overround.
    Returns implied probabilities (sum > 1.0 by the overround amount).
    """
    if len(true_probs) == 0:
        return []

    # Binary search for k
    # Larger k → p^(1/k) approaches 1.0 → larger total
    # Smaller k → p^(1/k) approaches 0 → smaller total
    k_low, k_high = 0.01, 10.0
    for _ in range(100):
        k_mid = (k_low + k_high) / 2.0
        total = sum(p ** (1.0 / k_mid) for p in true_probs)
        if total > target_overround:
            k_high = k_mid  # total too large, decrease k
        else:
            k_low = k_mid  # total too small, increase k

    k = (k_low + k_high) / 2.0
    return [p ** (1.0 / k) for p in true_probs]


def prob_to_decimal_odds(prob: float) -> float:
    """Convert probability to European decimal odds."""
    if prob <= 0:
        return 999.0
    return round(1.0 / prob, 2)


def knockout_probability(
    elo_a: float, elo_b: float, a_is_higher_seed: bool = True, stage: str = "QF"
) -> float:
    """Calculate knockout match win probability for player A.

    Applies:
    1. Elo-based raw probability
    2. Shrinkage toward 50% (alpha=0.70)
    3. Choking penalty for favorite (2pp)
    4. Throw-order bonus for higher seed (3pp)
    5. Fatigue factor for later rounds
    """
    # Raw Elo probability
    p_raw = expected_score(elo_a, elo_b)

    # Shrinkage toward 50%
    p_shrunk = KNOCKOUT_ALPHA * p_raw + (1 - KNOCKOUT_ALPHA) * 0.5

    # Choking penalty: applied to favorite (prob > 0.5)
    if p_shrunk > 0.5:
        p_shrunk -= CHOKING_PENALTY
    else:
        p_shrunk += CHOKING_PENALTY

    # Throw-order bonus for higher seed
    if a_is_higher_seed:
        p_shrunk += THROW_ORDER_BONUS
    else:
        p_shrunk -= THROW_ORDER_BONUS

    # Fatigue factor
    fatigue = FATIGUE_FACTORS.get(stage, 1.0)
    # Fatigue pulls probability toward 50% (both players equally fatigued
    # but it increases randomness)
    p_final = 0.5 + (p_shrunk - 0.5) * fatigue

    # Clamp to [0.05, 0.95]
    return max(0.05, min(0.95, p_final))


def get_match_odds(elo_ratings: dict[str, PlayerRating], sched_matches: list[dict]) -> list[dict]:
    """Generate odds for all scheduled matches.

    Returns list of dicts:
        {match_id, round, player1, player2, prob1, prob2, odds1, odds2}
    """
    results = []

    for m in sched_matches:
        p1 = m["player1"]
        p2 = m["player2"]

        elo1 = elo_ratings[p1].elo if p1 in elo_ratings else INITIAL_ELO
        elo2 = elo_ratings[p2].elo if p2 in elo_ratings else INITIAL_ELO

        # True probabilities
        true_p1 = expected_score(elo1, elo2)
        true_p2 = 1.0 - true_p1

        # Apply overround
        implied = apply_power_overround([true_p1, true_p2], TARGET_OVERROUND_MATCH)

        results.append(
            {
                "match_id": m["match_id"],
                "round": m["round"],
                "player1": p1,
                "player2": p2,
                "elo1": round(elo1, 1),
                "elo2": round(elo2, 1),
                "true_prob1": round(true_p1, 4),
                "true_prob2": round(true_p2, 4),
                "implied_prob1": round(implied[0], 4),
                "implied_prob2": round(implied[1], 4),
                "odds1": prob_to_decimal_odds(implied[0]),
                "odds2": prob_to_decimal_odds(implied[1]),
            }
        )

    return results


def _simulate_remaining_matches(
    elo_ratings: dict[str, PlayerRating], sched: list[dict], rng: random.Random
) -> dict[str, dict]:
    """Simulate remaining round-robin matches and return final standings.

    Returns dict of player -> {wins, losses, draws, leg_diff} including
    existing record from completed matches.
    """
    # Start with current actual standings
    current = get_standings()
    standings = {}
    for r in current:
        standings[r["player"]] = {
            "wins": r["wins"],
            "losses": r["losses"],
            "draws": r["draws"],
            "leg_diff": r["leg_diff"],
        }

    for m in sched:
        p1 = m["player1"]
        p2 = m["player2"]
        elo1 = elo_ratings[p1].elo if p1 in elo_ratings else INITIAL_ELO
        elo2 = elo_ratings[p2].elo if p2 in elo_ratings else INITIAL_ELO

        prob_p1 = expected_score(elo1, elo2)

        if rng.random() < prob_p1:
            # Player 1 wins - simulate score
            winner, loser = p1, p2
        else:
            winner, loser = p2, p1

        # Simulate margin: 3-0 (30%), 3-1 (35%), 3-2 (35%)
        margin_roll = rng.random()
        if margin_roll < 0.30:
            w_score, l_score = 3, 0
        elif margin_roll < 0.65:
            w_score, l_score = 3, 1
        else:
            w_score, l_score = 3, 2

        standings[winner]["wins"] += 1
        standings[winner]["leg_diff"] += w_score - l_score
        standings[loser]["losses"] += 1
        standings[loser]["leg_diff"] -= w_score - l_score

    return standings


def _get_top_8(standings: dict[str, dict]) -> list[str]:
    """Get top 8 players sorted by wins desc, then leg_diff desc."""
    players = list(standings.keys())
    players.sort(key=lambda p: (-standings[p]["wins"], -standings[p]["leg_diff"]))
    return players[:8]


def _simulate_knockout(
    top8: list[str], elo_ratings: dict[str, PlayerRating], rng: random.Random
) -> str:
    """Simulate seeded knockout bracket and return winner.

    Bracket: QF1: #1 vs #8, QF2: #4 vs #5, QF3: #2 vs #7, QF4: #3 vs #6
    SF1: QF1 winner vs QF2 winner
    SF2: QF3 winner vs QF4 winner
    Final: SF1 winner vs SF2 winner
    """
    qf_matchups = [
        (top8[0], top8[7], "QF"),  # #1 vs #8
        (top8[3], top8[4], "QF"),  # #4 vs #5
        (top8[1], top8[6], "QF"),  # #2 vs #7
        (top8[2], top8[5], "QF"),  # #3 vs #6
    ]

    qf_winners = []
    for higher_seed, lower_seed, stage in qf_matchups:
        elo_h = elo_ratings[higher_seed].elo if higher_seed in elo_ratings else INITIAL_ELO
        elo_l = elo_ratings[lower_seed].elo if lower_seed in elo_ratings else INITIAL_ELO

        prob_h = knockout_probability(elo_h, elo_l, a_is_higher_seed=True, stage=stage)
        winner = higher_seed if rng.random() < prob_h else lower_seed
        qf_winners.append(winner)

    # Semi-finals: QF1w vs QF2w, QF3w vs QF4w
    sf_matchups = [
        (qf_winners[0], qf_winners[1], "SF"),
        (qf_winners[2], qf_winners[3], "SF"),
    ]

    sf_winners = []
    for p_a, p_b, stage in sf_matchups:
        elo_a = elo_ratings[p_a].elo if p_a in elo_ratings else INITIAL_ELO
        elo_b = elo_ratings[p_b].elo if p_b in elo_ratings else INITIAL_ELO

        # Higher Elo = "higher seed" in semis
        if elo_a >= elo_b:
            prob_a = knockout_probability(elo_a, elo_b, a_is_higher_seed=True, stage=stage)
        else:
            prob_a = knockout_probability(elo_a, elo_b, a_is_higher_seed=False, stage=stage)

        winner = p_a if rng.random() < prob_a else p_b
        sf_winners.append(winner)

    # Final
    p_a, p_b = sf_winners[0], sf_winners[1]
    elo_a = elo_ratings[p_a].elo if p_a in elo_ratings else INITIAL_ELO
    elo_b = elo_ratings[p_b].elo if p_b in elo_ratings else INITIAL_ELO

    if elo_a >= elo_b:
        prob_a = knockout_probability(elo_a, elo_b, a_is_higher_seed=True, stage="Final")
    else:
        prob_a = knockout_probability(elo_a, elo_b, a_is_higher_seed=False, stage="Final")

    return p_a if rng.random() < prob_a else p_b


def get_outright_odds(
    elo_ratings: dict[str, PlayerRating],
    sched: list[dict],
    iterations: int = MC_ITERATIONS,
    seed: int = RANDOM_SEED,
) -> list[dict]:
    """Monte Carlo simulation for outright tournament winner odds.

    Simulates remaining round-robin matches + knockout bracket.

    Returns list of dicts sorted by probability:
        {player, wins_count, probability, implied_prob, odds}
    """
    rng = random.Random(seed)
    win_counts: dict[str, int] = defaultdict(int)
    top8_counts: dict[str, int] = defaultdict(int)

    for _ in range(iterations):
        # Simulate remaining round-robin
        standings = _simulate_remaining_matches(elo_ratings, sched, rng)

        # Get top 8
        top8 = _get_top_8(standings)
        for p in top8:
            top8_counts[p] += 1

        # Simulate knockout
        winner = _simulate_knockout(top8, elo_ratings, rng)
        win_counts[winner] += 1

    # Convert to probabilities
    results = []
    true_probs = []
    players_in_market = []

    # Only include players who made top 8 at least once
    for player in ALL_PLAYERS:
        if top8_counts[player] > 0:
            prob = win_counts[player] / iterations
            if prob > 0.001:  # Include if > 0.1% chance
                true_probs.append(prob)
                players_in_market.append(player)

    # Apply overround to all qualifying players
    if true_probs:
        implied_probs = apply_power_overround(true_probs, TARGET_OVERROUND_OUTRIGHT)
    else:
        implied_probs = true_probs

    for player, true_p, impl_p in zip(players_in_market, true_probs, implied_probs):
        results.append(
            {
                "player": player,
                "wins_count": win_counts[player],
                "top8_count": top8_counts[player],
                "top8_pct": round(top8_counts[player] / iterations * 100, 1),
                "true_probability": round(true_p, 4),
                "implied_probability": round(impl_p, 4),
                "odds": prob_to_decimal_odds(impl_p),
            }
        )

    results.sort(key=lambda r: -r["true_probability"])
    return results


def get_quarterfinal_matchup_odds(
    elo_ratings: dict[str, PlayerRating], top8: list[str]
) -> list[dict]:
    """Generate odds for quarterfinal matchups based on seeded bracket.

    Bracket: QF1: #1 vs #8, QF2: #4 vs #5, QF3: #2 vs #7, QF4: #3 vs #6
    """
    matchups = [
        ("QF1", top8[0], top8[7]),
        ("QF2", top8[3], top8[4]),
        ("QF3", top8[1], top8[6]),
        ("QF4", top8[2], top8[5]),
    ]

    results = []
    for label, higher, lower in matchups:
        elo_h = elo_ratings[higher].elo
        elo_l = elo_ratings[lower].elo

        prob_h = knockout_probability(elo_h, elo_l, a_is_higher_seed=True, stage="QF")
        prob_l = 1.0 - prob_h

        implied = apply_power_overround([prob_h, prob_l], TARGET_OVERROUND_MATCH)

        results.append(
            {
                "label": label,
                "higher_seed": higher,
                "lower_seed": lower,
                "elo_higher": round(elo_h, 1),
                "elo_lower": round(elo_l, 1),
                "true_prob_higher": round(prob_h, 4),
                "true_prob_lower": round(prob_l, 4),
                "odds_higher": prob_to_decimal_odds(implied[0]),
                "odds_lower": prob_to_decimal_odds(implied[1]),
            }
        )

    return results


if __name__ == "__main__":
    print("Fantasy Darts Odds Engine")
    print("=" * 60)

    # Get current Elo ratings
    ratings = get_elo_ratings()
    sched = scheduled_matches()

    print(f"\nScheduled matches: {len(sched)}")

    # Match odds for next scheduled matches (show first 10)
    print("\n" + "=" * 60)
    print("UPCOMING MATCH ODDS (next 10)")
    print("=" * 60)
    match_odds = get_match_odds(ratings, sched)

    print(f"{'ID':>4} {'R':>3}  {'Player 1':<22} {'Odds':>6}  {'Player 2':<22} {'Odds':>6}")
    print("-" * 80)
    for mo in match_odds[:10]:
        print(
            f"{mo['match_id']:>4} {mo['round']:>3}  "
            f"{mo['player1']:<22} {mo['odds1']:>6.2f}  "
            f"{mo['player2']:<22} {mo['odds2']:>6.2f}"
        )

    # Outright tournament winner
    print("\n" + "=" * 60)
    print("OUTRIGHT TOURNAMENT WINNER ODDS")
    print(f"(Monte Carlo: {MC_ITERATIONS} iterations)")
    print("=" * 60)
    outright = get_outright_odds(ratings, sched)

    print(f"{'Rank':>4} {'Player':<25} {'Win%':>6} {'Top8%':>6} {'Odds':>7}")
    print("-" * 55)
    for i, o in enumerate(outright, 1):
        win_pct = round(o["true_probability"] * 100, 1)
        print(
            f"{i:>4} {o['player']:<25} {win_pct:>5.1f}% "
            f"{o['top8_pct']:>5.1f}% {o['odds']:>7.2f}"
        )

    # Current top 8 and QF matchup odds
    print("\n" + "=" * 60)
    print("PROJECTED QUARTERFINAL ODDS (based on current top 8)")
    print("=" * 60)

    from elo_engine import get_sorted_ratings

    sorted_ratings = get_sorted_ratings(ratings)
    current_top8 = [name for name, _ in sorted_ratings[:8]]

    qf_odds = get_quarterfinal_matchup_odds(ratings, current_top8)
    for qf in qf_odds:
        print(
            f"\n{qf['label']}: #{current_top8.index(qf['higher_seed'])+1} "
            f"{qf['higher_seed']} ({qf['elo_higher']}) vs "
            f"#{current_top8.index(qf['lower_seed'])+1} "
            f"{qf['lower_seed']} ({qf['elo_lower']})"
        )
        print(
            f"  {qf['higher_seed']}: {qf['odds_higher']:.2f}  |  "
            f"{qf['lower_seed']}: {qf['odds_lower']:.2f}"
        )
