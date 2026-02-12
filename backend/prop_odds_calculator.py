"""Proposition (prop) odds calculator for Fantasy Darts Tournament.

Generates 7 types of prop markets for each match using Elo-based calibration:
1. Total 180s in match (over/under)
2. Total match legs (over/under)
3. Highest checkout in match (over/under threshold)
4. Player to hit a 180 (yes/no per player)
5. First leg winner
6. Exact match score (3-0, 3-1, 3-2 for each player)
7. Player to checkout 100+ (yes/no per player)

Odds are calibrated from Elo ratings:
- Higher-rated players have better 180/checkout probabilities
- Overround at 108% (matching match odds engine)
"""

from elo_engine import INITIAL_ELO, PlayerRating, expected_score
from odds_engine import apply_power_overround, prob_to_decimal_odds

TARGET_OVERROUND = 1.08


def short_name(full: str) -> str:
    """Convert 'John Smith' to 'John S.' for display in market titles."""
    parts = full.strip().split()
    if len(parts) <= 1:
        return full
    return f"{parts[0]} {parts[-1][0]}."


# --- Elo-derived skill mapping ---
# Maps Elo to a "skill percentile" in [0.3, 0.9] for prop calibration.
# 1200 Elo → 0.30 skill, 1800 Elo → 0.90 skill (linear interpolation)
ELO_FLOOR = 1200.0
ELO_CEIL = 1800.0
SKILL_FLOOR = 0.30
SKILL_CEIL = 0.90


def _elo_to_skill(elo: float) -> float:
    """Convert Elo rating to a skill percentile [0.3, 0.9]."""
    t = (elo - ELO_FLOOR) / (ELO_CEIL - ELO_FLOOR)
    t = max(0.0, min(1.0, t))
    return SKILL_FLOOR + t * (SKILL_CEIL - SKILL_FLOOR)


def _make_selections(true_probs: list[float], names: list[str]) -> list[dict]:
    """Apply overround and return [{name, odds}] selections."""
    implied = apply_power_overround(true_probs, TARGET_OVERROUND)
    return [{"name": name, "odds": prob_to_decimal_odds(ip)} for name, ip in zip(names, implied)]


# --- Market Type 1: Total 180s Over/Under ---


def total_180s_market(elo1: float, elo2: float, p1_name: str, p2_name: str) -> dict:
    """Over/Under on total 180s in the match.

    Higher skill → more 180s expected. Line set at 2.5.
    Average match ~2-3 180s for recreational players, ~5+ for strong players.
    """
    s1 = _elo_to_skill(elo1)
    s2 = _elo_to_skill(elo2)
    avg_skill = (s1 + s2) / 2

    # Expected 180s: low-skill match ~1.5, high-skill ~5.0
    expected = 1.5 + avg_skill * 5.0
    line = 2.5

    # P(over) based on how far expected is above line
    # Using a simple logistic-style mapping
    diff = expected - line
    p_over = max(0.10, min(0.90, 0.50 + diff * 0.12))
    p_under = 1.0 - p_over

    sels = _make_selections([p_over, p_under], ["Over 2.5", "Under 2.5"])
    return {
        "name": f"{p1_name} vs {p2_name}: Total 180s",
        "description": f"Will there be over or under 2.5 180s in the match? Expected: ~{expected:.1f}",
        "selections": sels,
    }


# --- Market Type 2: Total Match Legs Over/Under ---


def total_legs_market(elo1: float, elo2: float, p1_name: str, p2_name: str) -> dict:
    """Over/Under on total legs played. First to 3 legs → min 3, max 5.

    Evenly-matched players → more legs (closer matches). Line at 4.5.
    """
    p1_win = expected_score(elo1, elo2)
    # Probability of going to 5 legs increases when match is closer
    closeness = 1.0 - abs(p1_win - 0.50) * 2  # 0=blowout, 1=even

    # P(5 legs) ≈ closeness^0.7 scaled
    p_five = max(0.15, min(0.65, 0.20 + closeness * 0.40))
    # Over 4.5 = exactly 5 legs
    p_over = p_five
    p_under = 1.0 - p_over

    sels = _make_selections([p_over, p_under], ["Over 4.5", "Under 4.5"])
    return {
        "name": f"{p1_name} vs {p2_name}: Total Legs",
        "description": "Will the match go to a deciding 5th leg?",
        "selections": sels,
    }


# --- Market Type 3: Highest Checkout Over/Under ---


def highest_checkout_market(elo1: float, elo2: float, p1_name: str, p2_name: str) -> dict:
    """Over/Under on highest checkout in the match. Line at 80.5.

    Higher Elo → higher checkout ability.
    """
    s1 = _elo_to_skill(elo1)
    s2 = _elo_to_skill(elo2)
    best_skill = max(s1, s2)

    # Expected max checkout: low-skill ~60, high-skill ~120
    expected_max = 50 + best_skill * 90
    line = 80.5

    diff = expected_max - line
    p_over = max(0.10, min(0.90, 0.50 + diff * 0.008))
    p_under = 1.0 - p_over

    sels = _make_selections([p_over, p_under], ["Over 80.5", "Under 80.5"])
    return {
        "name": f"{p1_name} vs {p2_name}: Highest Checkout",
        "description": f"Will the highest checkout exceed 80.5? Estimated max: ~{expected_max:.0f}",
        "selections": sels,
    }


# --- Market Type 4: Player to Hit a 180 (Yes/No) ---


def player_180_market(elo: float, player_name: str, opponent_name: str) -> dict:
    """Will this player hit at least one 180 in the match?

    Higher Elo → higher 180 probability.
    """
    skill = _elo_to_skill(elo)

    # P(at least one 180): low-skill ~15%, high-skill ~70%
    p_yes = max(0.10, min(0.85, 0.10 + skill * 0.75))
    p_no = 1.0 - p_yes

    sels = _make_selections([p_yes, p_no], ["Yes", "No"])
    return {
        "name": f"{player_name} to hit a 180 (vs {opponent_name})",
        "description": f"Will {player_name} score at least one maximum 180?",
        "selections": sels,
    }


# --- Market Type 5: First Leg Winner ---


def first_leg_market(elo1: float, elo2: float, p1_name: str, p2_name: str) -> dict:
    """Who wins the first leg?

    Slight boost for Elo favorite (less pressure early). Uses raw Elo prob.
    """
    p1_win = expected_score(elo1, elo2)
    p2_win = 1.0 - p1_win

    sels = _make_selections([p1_win, p2_win], [p1_name, p2_name])
    return {
        "name": f"{p1_name} vs {p2_name}: First Leg Winner",
        "description": "Who will win the opening leg of the match?",
        "selections": sels,
    }


# --- Market Type 6: Exact Match Score ---


def exact_score_market(elo1: float, elo2: float, p1_name: str, p2_name: str) -> dict:
    """Exact match score — 6 outcomes: 3-0, 3-1, 3-2 for each player.

    Score distribution derived from Elo win probability.
    """
    p1_win = expected_score(elo1, elo2)
    p2_win = 1.0 - p1_win

    # Score distribution within a win: 3-0 (30%), 3-1 (35%), 3-2 (35%)
    # Stronger favorites more likely to win 3-0
    fav_bonus = abs(p1_win - 0.50) * 0.20  # Up to +10% for 3-0 if big fav

    probs = [
        p1_win * (0.30 + fav_bonus),  # P1 3-0
        p1_win * (0.35),  # P1 3-1
        p1_win * (0.35 - fav_bonus),  # P1 3-2
        p2_win * (0.30 + fav_bonus),  # P2 3-0
        p2_win * (0.35),  # P2 3-1
        p2_win * (0.35 - fav_bonus),  # P2 3-2
    ]
    # Clamp and normalize
    probs = [max(0.02, p) for p in probs]
    total = sum(probs)
    probs = [p / total for p in probs]

    names = [
        f"{p1_name} 3-0",
        f"{p1_name} 3-1",
        f"{p1_name} 3-2",
        f"{p2_name} 3-0",
        f"{p2_name} 3-1",
        f"{p2_name} 3-2",
    ]

    sels = _make_selections(probs, names)
    return {
        "name": f"{p1_name} vs {p2_name}: Exact Score",
        "description": "Predict the exact final score of the match.",
        "selections": sels,
    }


# --- Market Type 7: Player to Checkout 100+ ---


def player_ton_plus_checkout_market(elo: float, player_name: str, opponent_name: str) -> dict:
    """Will this player hit a checkout of 100 or more?

    Higher Elo → better finishing ability.
    """
    skill = _elo_to_skill(elo)

    # P(ton+ checkout): low-skill ~8%, high-skill ~50%
    p_yes = max(0.05, min(0.70, 0.05 + skill * 0.55))
    p_no = 1.0 - p_yes

    sels = _make_selections([p_yes, p_no], ["Yes", "No"])
    return {
        "name": f"{player_name} 100+ checkout (vs {opponent_name})",
        "description": f"Will {player_name} hit a checkout of 100 or higher?",
        "selections": sels,
    }


# --- Aggregate: All prop markets for a match ---


def get_all_prop_markets(
    elo_ratings: dict[str, PlayerRating],
    match: dict,
) -> list[dict]:
    """Generate all 7 prop market types for a single match.

    Args:
        elo_ratings: dict of player name -> PlayerRating
        match: dict with player1, player2, round, match_id

    Returns:
        List of market dicts, each with: name, description, selections
    """
    p1 = match["player1"]
    p2 = match["player2"]
    elo1 = elo_ratings[p1].elo if p1 in elo_ratings else INITIAL_ELO
    elo2 = elo_ratings[p2].elo if p2 in elo_ratings else INITIAL_ELO

    sn1 = short_name(p1)
    sn2 = short_name(p2)

    markets = [
        total_180s_market(elo1, elo2, sn1, sn2),
        total_legs_market(elo1, elo2, sn1, sn2),
        highest_checkout_market(elo1, elo2, sn1, sn2),
        player_180_market(elo1, sn1, sn2),
        player_180_market(elo2, sn2, sn1),
        first_leg_market(elo1, elo2, sn1, sn2),
        exact_score_market(elo1, elo2, sn1, sn2),
        player_ton_plus_checkout_market(elo1, sn1, sn2),
        player_ton_plus_checkout_market(elo2, sn2, sn1),
    ]

    # Tag each market with source match info
    for m in markets:
        m["match_round"] = match["round"]
        m["match_id"] = match["match_id"]

    return markets
