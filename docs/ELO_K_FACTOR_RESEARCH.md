# Elo K-Factor Tuning for Amateur Darts Tournaments

## Research Report | February 2026

**Context:** 20-player friend-group darts tournament, 380 matches across 38 rounds (double round-robin), followed by an 8-player seeded knockout bracket. Best-of-5 legs format. Current predictor uses static Elo estimation from win rate and point differential.

**Objective:** Determine the optimal K-factor (or dynamic K-factor strategy) for accurate odds generation in this specific tournament context.

---

## Table of Contents

1. [Standard Elo K-Factors Across Sports](#1-standard-elo-k-factors-across-sports)
2. [Darts-Specific Considerations](#2-darts-specific-considerations)
3. [Recommended K-Factor Range for Amateur Darts](#3-recommended-k-factor-range-for-amateur-darts)
4. [Dynamic K-Factor Approaches](#4-dynamic-k-factor-approaches)
5. [Practical Implementation](#5-practical-implementation)
6. [Validation Strategy](#6-validation-strategy)
7. [Sources](#7-sources)

---

## 1. Standard Elo K-Factors Across Sports

### 1.1 Chess (The Original)

Chess is where Elo ratings originated, and chess federations have the most refined K-factor systems:

| Organization | K-Factor | Condition |
|---|---|---|
| **FIDE** | K = 40 | New players (< 30 rated games) |
| **FIDE** | K = 20 | Established players (rating < 2400) |
| **FIDE** | K = 10 | Elite players (rating >= 2400, permanently) |
| **USCF** | K = 32 | New/developing players (< 2100) |
| **USCF** | K = 24 | Intermediate players (2100-2400) |
| **USCF** | K = 16 | Elite players (>= 2400) |

**Key insight:** Chess uses low K-factors because individual game variance is relatively low at the professional level. A grandmaster rarely loses to an amateur. The tiered system reflects that new players need rapid rating convergence while elite players have stable, well-known skill levels.

### 1.2 Football (Soccer)

The World Football Elo Ratings use a tournament-importance-weighted K-factor:

| Match Type | K-Factor |
|---|---|
| World Cup finals | K = 60 |
| Continental championship finals | K = 50 |
| World Cup / continental qualifiers | K = 40 |
| Other tournaments | K = 30 |
| Friendly matches | K = 20 |

Additionally, a **margin of victory multiplier** is applied:

```
K_effective = K * MOV_multiplier

MOV_multiplier:
  1-goal margin:  1.0
  2-goal margin:  1.5
  3-goal margin:  1.75
  4+ goal margin: 1.75 + (N - 3) / 8
```

**Key insight:** Football uses high K-factors (20-60) because team sports have significant match-to-match variance. Injuries, form, home advantage, and tactical matchups create much higher upset rates than chess.

### 1.3 Tennis

The Ultimate Tennis Statistics system uses a sophisticated multi-factor K:

| Factor | Adjustment |
|---|---|
| Base K | 32 |
| Grand Slam | 100% of base |
| Tour Finals | 90% |
| Masters | 85% |
| ATP 500 | 75% |
| Other | 70% |
| Final round | 100% |
| Semi-final | 90% |
| Quarter-final | 85% |
| Best-of-5 format | 100% |
| Best-of-3 format | 90% |

Additionally, a **player rating adjustment** function applies:

```
rating_multiplier = 1 + 18 / (1 + 2^((rating - 1500) / 63))
```

This gives lower-rated players (~1500) a multiplier of approximately 10x, while players rated 2200+ get approximately 1x. This allows new/weaker players to converge rapidly.

**Key insight:** Tennis K-factors explicitly account for format length (best-of-5 vs best-of-3), tournament importance, and round progression -- all directly applicable to darts.

### 1.4 FiveThirtyEight NBA / NFL

FiveThirtyEight uses K = 20 for both NBA and NFL with a margin-of-victory adjustment:

```
K_effective = K * ln(|MOV| + 1) * (2.2 / (ED * 0.001 + 2.2))
```

Where:
- `MOV` = margin of victory
- `ED` = Elo difference (winner minus loser)
- The second term is an **autocorrelation correction** preventing favorites from gaining too much for expected blowouts

### 1.5 Summary Table

| Sport | K Range | Upset Frequency | Format Variance | Pool Size |
|---|---|---|---|---|
| Chess (FIDE) | 10-40 | Low | Low (single game, deterministic) | 10,000+ |
| Chess (USCF) | 16-32 | Low | Low | 50,000+ |
| Football | 20-60 | Medium | Medium (90-min match) | 200+ nations |
| Tennis | 22-32 effective | Medium | Medium (sets absorb variance) | 2,000+ |
| NBA/NFL | 20 base | Medium-High | High (single game) | 30 teams |
| **Darts (DartsRec)** | **24-32** | **High** | **High (best-of-5 legs)** | **10,000+** |

### 1.6 What Determines K-Factor Choice

The theoretical framework (Chan, 2022) establishes that the MSE-optimal K-factor depends on:

1. **Number of participants (n):** Smaller pools need higher K for faster convergence
2. **Rating deviation variance (sigma):** Higher true skill variance requires higher K
3. **Quality of initial ratings:** Better initial estimates allow lower K
4. **Number of games per player:** More games allow lower K (ratings have more time to converge)
5. **Match outcome variance:** Higher upset rates require higher K to capture form changes

The general relationship is:

```
K_optimal ~ f(sigma^2, n)

Where:
- K increases as sigma^2 increases (more skill variance in pool)
- K decreases as n increases (more opponents provide more information)
- K decreases as initial rating accuracy increases
```

---

## 2. Darts-Specific Considerations

### 2.1 Match Volatility: Darts vs Other Sports

Darts is fundamentally more volatile than most rated sports for several reasons:

**Leg-level variance is extreme.** In a single leg of 501, any amateur player can hit a hot streak of treble-20s and close out quickly. Unlike chess, where a 200-point rating gap virtually guarantees the higher-rated player wins, a 200-point Elo gap in amateur darts might translate to only a 60-65% win probability per leg.

**Best-of-5 amplifies upsets.** The mathematics of best-of-N series show that shorter formats compress win probabilities toward 50%:

| Single-leg win probability | Best-of-3 match win | Best-of-5 match win | Best-of-7 match win |
|---|---|---|---|
| 55% | 57.5% | 59.3% | 60.8% |
| 60% | 64.8% | 68.3% | 71.0% |
| 65% | 71.8% | 76.5% | 80.0% |
| 70% | 78.4% | 83.7% | 87.4% |

**Derivation.** For a best-of-5 (first to 3), if player A has per-leg win probability `p`:

```
P(A wins match) = p^3                           # 3-0
                + 3 * p^3 * (1-p)               # 3-1
                + 6 * p^3 * (1-p)^2             # 3-2

P(A wins) = p^3 * (1 + 3(1-p) + 6(1-p)^2)
          = p^3 * (6 - 15p + 10p^2)            # Simplified via binomial
```

For amateur darts where the per-leg advantage is often only 55-60%, the match win probability compresses significantly. A player who wins 60% of individual legs only wins 68.3% of best-of-5 matches. This means upsets happen in roughly 1 in 3 matches even between meaningfully different skill levels.

**Comparison to professional darts:** Professional PDC data shows favorites win 72-78% of matches. In amateur play, this drops to an estimated 60-70% because:
- Amateur three-dart averages (40-70) have higher coefficient of variation than pros (85-105)
- Checkout percentage is much more volatile at amateur level
- Psychological factors (nerves, pressure) have outsized effects on amateurs

### 2.2 Format Effects on K-Factor

The match format directly affects how much information a single result conveys:

| Format | Information Content | Recommended K Adjustment |
|---|---|---|
| Best of 3 (first to 2) | Low -- high variance, upsets common | K * 0.85 |
| Best of 5 (first to 3) | Medium -- your tournament format | K * 1.00 (baseline) |
| Best of 7 (first to 4) | Medium-High | K * 1.10 |
| Best of 9 (first to 5) | High -- more reliable signal | K * 1.15 |
| Best of 11+ | Very High | K * 1.20 |

**Rationale:** Longer formats provide more information about true skill, so each match result should carry more weight (higher effective K). A 3-0 result in a best-of-5 is more informative than a 2-0 in a best-of-3.

This mirrors the tennis approach where best-of-5 gets 100% K and best-of-3 gets 90%.

### 2.3 Amateur vs Professional Level

| Factor | Professional | Amateur (Your Tournament) | K Implication |
|---|---|---|---|
| Three-dart average | 85-105 | 40-70 | Higher variance -> higher K |
| Average consistency | Low CoV (0.10-0.15) | High CoV (0.20-0.40) | More noise -> need to capture rapid form changes |
| Checkout % | 38-45% | 15-30% | Doubles variance dominates amateur results |
| Mental resilience | High (trained) | Variable | Form swings are larger and faster |
| Practice regularity | Daily | Weekly/irregular | Skills can change rapidly between sessions |
| Upset rate | ~25% | ~35-40% | Ratings must be more responsive |

**Critical implication:** Amateur players improve (and decline) much faster than professionals. A player who practices heavily for 2 weeks can jump 100+ Elo points of true skill. A static K = 10 (chess elite) would take 10+ matches to reflect this. At K = 32, it takes 3-4 matches.

### 2.4 Small Player Pool Effects (8-20 Players)

Small pools create unique challenges:

1. **Limited opponents:** In a 20-player round-robin, each player faces only 19 unique opponents (38 matches with double RR). Ratings must converge within these limited data points.

2. **Correlated ratings:** In a small closed pool, every rating change affects the relative standing of all other players. A single upset cascades through the system.

3. **No external anchor:** Unlike chess (where FIDE maintains a global scale), your ratings exist only within the pool. This means the absolute values are less meaningful -- only relative differences matter.

4. **Faster convergence needed:** With only 38 matches per player total, you cannot afford K = 10 (would take 50+ games to converge). You need K high enough to reach approximate true ratings within 15-20 matches.

**MSE-optimal K for 20 players (from Chan 2022):** The research shows that for a 20-player round-robin, the MSE-optimal K is significantly higher than the FIDE values. With uniform initial ratings (all start at 1500), the optimal K falls in the range of **20-30**, depending on the true skill variance in the pool. If initial ratings are pre-calibrated from historical data, K can be reduced to **14-20**.

---

## 3. Recommended K-Factor Range for Amateur Darts

### 3.1 Primary Recommendation: K = 32 (Base), Dynamic Range 24-48

For your specific tournament (20 players, best-of-5 legs, amateur level, double round-robin + knockout), the recommended **base K-factor is 32**, with dynamic adjustments.

### 3.2 Justification

| Factor | Influence | Pushes K... |
|---|---|---|
| Amateur skill variance | High CoV, rapid improvement/decline | Higher |
| Best-of-5 legs format | Medium information per match | Neutral (baseline) |
| Small pool (20 players) | Need fast convergence, limited data | Higher |
| Double round-robin (38 matches) | Reasonable data volume | Slightly lower |
| No prior rating data | All start at 1500 | Higher initially |
| Knockout bracket importance | High-stakes, need accurate pre-bracket ratings | Lower (stable) by knockout phase |

**Comparison with existing implementations:**
- DartsRec uses K = 24 (normal) / K = 32 (major) for their global system with 10,000+ players
- Your pool is 500x smaller -- you need at least as much responsiveness
- The FDI system achieves ~70% predictive accuracy with its Elo variant -- a reasonable target

### 3.3 K-Factor by Phase

| Tournament Phase | Rounds | Recommended K | Rationale |
|---|---|---|---|
| Early round-robin (Rounds 1-10) | Matches 1-100 | K = 40-48 | Provisional: fast convergence from flat 1500 start |
| Mid round-robin (Rounds 11-25) | Matches 101-250 | K = 32 | Standard: ratings are stabilizing |
| Late round-robin (Rounds 26-38) | Matches 251-380 | K = 24 | Settled: ratings should be stable for bracket seeding |
| Knockout (QF-SF-Final) | 7 matches | K = 36 | Higher stakes: upsets should shift ratings meaningfully |

---

## 4. Dynamic K-Factor Approaches

### 4.1 Games-Played Decay (Recommended)

The simplest and most effective dynamic K approach: K decreases as a player accumulates more matches.

```
K(n) = K_max - (K_max - K_min) * min(n / n_threshold, 1.0)

Where:
  K_max       = 48   (first match K)
  K_min       = 24   (floor K after threshold)
  n           = number of matches played by this player
  n_threshold = 20   (matches to reach K_min)
```

**Example progression:**

| Matches Played | K-Factor |
|---|---|
| 0 | 48 |
| 5 | 42 |
| 10 | 36 |
| 15 | 30 |
| 20+ | 24 |

This mirrors the FIDE approach (K=40 for <30 games, K=20 for established) but compressed for a shorter tournament.

### 4.2 Rating Volatility Tracker (Advanced)

Track each player's recent performance volatility and adjust K accordingly:

```
volatility(player) = stdev(last_N_actual_results - last_N_expected_results)

K(player) = K_base * (1 + volatility(player))

Where:
  K_base = 28
  N = 5 (rolling window)
```

If a player's results have been unpredictable (high volatility), their K increases to allow faster adjustment. If results match expectations (low volatility), K stays near base.

**This is essentially a simplified Glicko-1 approach** without the full rating deviation mathematics. The Glicko system natively handles this by maintaining a "ratings deviation" (RD) per player that decays with inactivity and increases with unexpected results.

### 4.3 Tournament Phase Weighting (Moderate Complexity)

Weight K by the phase of the tournament, analogous to the football/tennis systems:

```
K_effective = K_base * phase_multiplier * format_multiplier

phase_multiplier:
  Round-robin early (rounds 1-10):    1.3
  Round-robin mid (rounds 11-25):     1.0
  Round-robin late (rounds 26-38):    0.8
  Knockout QF:                        1.1
  Knockout SF:                        1.15
  Knockout Final:                     1.2

format_multiplier:
  Best of 3 legs:   0.85
  Best of 5 legs:   1.00
  Best of 7 legs:   1.10
```

### 4.4 Margin of Victory Adjustment (Recommended)

Darts uniquely provides rich margin-of-victory data through the leg score (3-0, 3-1, 3-2):

```
K_effective = K * MOV_multiplier

MOV_multiplier for best-of-5:
  3-0 (dominant win):    1.30   # Strong evidence of skill gap
  3-1 (clear win):       1.10   # Moderate evidence
  3-2 (close win):       0.85   # Minimal evidence -- could go either way
  0-3 (dominant loss):   1.30   # (symmetric: loser loses more)
  1-3 (clear loss):      1.10
  2-3 (close loss):      0.85
```

**Mathematical justification:** A 3-0 result in best-of-5 has probability:

```
P(3-0) = p^3

For p = 0.60: P(3-0) = 0.216 (21.6%)
For p = 0.50: P(3-0) = 0.125 (12.5%)
```

A 3-0 result from a 50/50 matchup is unlikely (12.5%), so it provides strong evidence that the winner is genuinely better. Conversely, a 3-2 from a 60/40 matchup is quite likely (35%), providing little new information.

### 4.5 Combined Dynamic K Formula (Recommended Final)

Combining the best elements:

```
K_effective(player, match) = K_base
                           * games_decay(player.matches_played)
                           * phase_weight(current_phase)
                           * mov_multiplier(leg_score)

Where:
  K_base = 32

  games_decay(n) = max(0.75, 1.5 - 0.025 * n)
    # Starts at 1.5 (K_eff=48), decays to 0.75 (K_eff=24) at n=30

  phase_weight = {early_rr: 1.1, mid_rr: 1.0, late_rr: 0.9, knockout: 1.1}

  mov_multiplier = {(3,0): 1.30, (3,1): 1.10, (3,2): 0.85}
```

**Effective K range with all multipliers:**
- Maximum: 32 * 1.5 * 1.1 * 1.30 = **68.6** (new player, early round, 3-0 win)
- Typical mid-tournament: 32 * 1.0 * 1.0 * 1.10 = **35.2** (established, mid-round, 3-1)
- Minimum: 32 * 0.75 * 0.9 * 0.85 = **18.4** (veteran, late round, 3-2)

This range (18-69) is wider than chess but appropriate for the high-variance amateur darts context.

---

## 5. Practical Implementation

### 5.1 Core Elo Update Formula

The standard Elo update, applied after each match:

```
R_new = R_old + K_eff * (S - E)

Where:
  R_old  = current rating
  K_eff  = effective K-factor (dynamic, see Section 4.5)
  S      = actual score (1.0 for win, 0.0 for loss, 0.5 for draw)
  E      = expected score = 1 / (1 + 10^((R_opponent - R_old) / 400))
```

### 5.2 Python Implementation

```python
import math
from dataclasses import dataclass, field
from typing import Optional

# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_ELO = 1500
K_BASE = 32
GAMES_DECAY_RATE = 0.025       # How fast K decays per game
GAMES_DECAY_FLOOR = 0.75       # Minimum multiplier
GAMES_DECAY_CEILING = 1.50     # Maximum multiplier (new players)

# Phase weights
PHASE_WEIGHTS = {
    "early_rr": 1.1,    # Rounds 1-10
    "mid_rr": 1.0,      # Rounds 11-25
    "late_rr": 0.9,     # Rounds 26-38
    "knockout": 1.1,     # QF/SF/Final
}

# Margin of victory multipliers (winner_legs, loser_legs)
MOV_MULTIPLIERS = {
    (3, 0): 1.30,
    (3, 1): 1.10,
    (3, 2): 0.85,
}


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class PlayerRating:
    name: str
    rating: float = BASE_ELO
    matches_played: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    rating_history: list = field(default_factory=list)

    @property
    def win_rate(self) -> float:
        if self.matches_played == 0:
            return 0.0
        return self.wins / self.matches_played


# =============================================================================
# K-FACTOR CALCULATION
# =============================================================================

def games_decay(matches_played: int) -> float:
    """
    Decay multiplier based on number of matches played.
    New players get K * 1.5, veterans get K * 0.75.

    Linear decay: starts at CEILING, decreases by RATE per game,
    floors at FLOOR.
    """
    raw = GAMES_DECAY_CEILING - GAMES_DECAY_RATE * matches_played
    return max(GAMES_DECAY_FLOOR, min(GAMES_DECAY_CEILING, raw))


def get_phase_weight(round_number: int, is_knockout: bool = False) -> float:
    """Get phase weight based on current round."""
    if is_knockout:
        return PHASE_WEIGHTS["knockout"]
    elif round_number <= 10:
        return PHASE_WEIGHTS["early_rr"]
    elif round_number <= 25:
        return PHASE_WEIGHTS["mid_rr"]
    else:
        return PHASE_WEIGHTS["late_rr"]


def get_mov_multiplier(winner_legs: int, loser_legs: int) -> float:
    """Get margin of victory multiplier."""
    return MOV_MULTIPLIERS.get((winner_legs, loser_legs), 1.0)


def calculate_k_factor(
    player: PlayerRating,
    round_number: int,
    winner_legs: int,
    loser_legs: int,
    is_knockout: bool = False,
) -> float:
    """
    Calculate the effective K-factor for a given match context.

    K_effective = K_base * games_decay * phase_weight * mov_multiplier
    """
    k = K_BASE
    k *= games_decay(player.matches_played)
    k *= get_phase_weight(round_number, is_knockout)
    k *= get_mov_multiplier(winner_legs, loser_legs)
    return k


# =============================================================================
# ELO UPDATE
# =============================================================================

def expected_score(rating_a: float, rating_b: float) -> float:
    """
    Calculate expected score for player A against player B.

    E_A = 1 / (1 + 10^((R_B - R_A) / 400))
    """
    return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 400))


def update_ratings(
    winner: PlayerRating,
    loser: PlayerRating,
    winner_legs: int,
    loser_legs: int,
    round_number: int,
    is_knockout: bool = False,
) -> tuple[float, float]:
    """
    Update Elo ratings after a match.

    Returns (winner_new_rating, loser_new_rating).
    """
    # Calculate expected scores
    e_winner = expected_score(winner.rating, loser.rating)
    e_loser = 1.0 - e_winner

    # Calculate effective K for each player (can differ based on games played)
    k_winner = calculate_k_factor(
        winner, round_number, winner_legs, loser_legs, is_knockout
    )
    k_loser = calculate_k_factor(
        loser, round_number, winner_legs, loser_legs, is_knockout
    )

    # Update ratings
    winner_delta = k_winner * (1.0 - e_winner)
    loser_delta = k_loser * (0.0 - e_loser)

    winner.rating += winner_delta
    loser.rating += loser_delta

    # Update match counts
    winner.matches_played += 1
    winner.wins += 1
    loser.matches_played += 1
    loser.losses += 1

    # Record history
    winner.rating_history.append(winner.rating)
    loser.rating_history.append(loser.rating)

    return winner.rating, loser.rating


def handle_draw(
    player_a: PlayerRating,
    player_b: PlayerRating,
    round_number: int,
) -> tuple[float, float]:
    """
    Handle a drawn match (e.g., 0-0 or other tie result).
    """
    e_a = expected_score(player_a.rating, player_b.rating)
    e_b = 1.0 - e_a

    # Use base K * games_decay * phase_weight (no MOV multiplier for draws)
    k_a = K_BASE * games_decay(player_a.matches_played) * get_phase_weight(round_number)
    k_b = K_BASE * games_decay(player_b.matches_played) * get_phase_weight(round_number)

    # Draw = 0.5 actual score
    player_a.rating += k_a * (0.5 - e_a)
    player_b.rating += k_b * (0.5 - e_b)

    player_a.matches_played += 1
    player_a.draws += 1
    player_b.matches_played += 1
    player_b.draws += 1

    player_a.rating_history.append(player_a.rating)
    player_b.rating_history.append(player_b.rating)

    return player_a.rating, player_b.rating


# =============================================================================
# PREDICTION
# =============================================================================

def predict_match(player_a: PlayerRating, player_b: PlayerRating) -> dict:
    """
    Predict match outcome between two players.

    Returns dict with probabilities and confidence.
    """
    e_a = expected_score(player_a.rating, player_b.rating)
    e_b = 1.0 - e_a

    favorite = player_a if e_a >= e_b else player_b
    confidence = max(e_a, e_b)

    return {
        "player_a": player_a.name,
        "player_b": player_b.name,
        "rating_a": round(player_a.rating, 1),
        "rating_b": round(player_b.rating, 1),
        "prob_a": round(e_a * 100, 1),
        "prob_b": round(e_b * 100, 1),
        "favorite": favorite.name,
        "confidence": round(confidence * 100, 1),
        "elo_diff": round(abs(player_a.rating - player_b.rating), 1),
    }


def match_prob_to_decimal_odds(prob: float) -> float:
    """Convert win probability to decimal betting odds."""
    if prob <= 0:
        return float('inf')
    return round(1.0 / prob, 2)


def predict_with_odds(player_a: PlayerRating, player_b: PlayerRating) -> dict:
    """Predict match with decimal odds for betting."""
    pred = predict_match(player_a, player_b)
    pred["odds_a"] = match_prob_to_decimal_odds(pred["prob_a"] / 100)
    pred["odds_b"] = match_prob_to_decimal_odds(pred["prob_b"] / 100)
    return pred


# =============================================================================
# TOURNAMENT PROCESSOR
# =============================================================================

def process_tournament(
    matches: list[tuple[str, str, int, int]],
    ties: list[tuple[str, str]] = None,
) -> dict[str, PlayerRating]:
    """
    Process all tournament matches and return final ratings.

    Args:
        matches: List of (winner_key, loser_key, winner_legs, loser_legs)
        ties: List of (player_a_key, player_b_key) for drawn matches

    Returns:
        Dict mapping player keys to PlayerRating objects.
    """
    players: dict[str, PlayerRating] = {}

    # Process matches in order (round-robin, 10 matches per round)
    for i, (winner_key, loser_key, w_legs, l_legs) in enumerate(matches):
        round_number = (i // 10) + 1

        # Initialize players if first appearance
        if winner_key not in players:
            players[winner_key] = PlayerRating(name=winner_key)
        if loser_key not in players:
            players[loser_key] = PlayerRating(name=loser_key)

        update_ratings(
            winner=players[winner_key],
            loser=players[loser_key],
            winner_legs=w_legs,
            loser_legs=l_legs,
            round_number=round_number,
        )

    # Process ties
    if ties:
        for player_a_key, player_b_key in ties:
            if player_a_key not in players:
                players[player_a_key] = PlayerRating(name=player_a_key)
            if player_b_key not in players:
                players[player_b_key] = PlayerRating(name=player_b_key)
            # Assign to mid-tournament round for ties without known round
            handle_draw(players[player_a_key], players[player_b_key], 20)

    return players


# =============================================================================
# ODDS GENERATION FOR BETTING PLATFORM
# =============================================================================

def generate_match_odds(
    players: dict[str, PlayerRating],
    matchups: list[tuple[str, str]],
    margin: float = 0.05,
) -> list[dict]:
    """
    Generate betting odds for a list of matchups.

    Args:
        players: Current player ratings
        matchups: List of (player_a_key, player_b_key)
        margin: Bookmaker margin (0.05 = 5% overround)

    Returns:
        List of odds dicts for each matchup.
    """
    results = []

    for a_key, b_key in matchups:
        pred = predict_match(players[a_key], players[b_key])

        # Apply margin (overround)
        prob_a = pred["prob_a"] / 100
        prob_b = pred["prob_b"] / 100

        # Scale probabilities to include margin
        total = prob_a + prob_b  # Should be ~1.0
        margin_factor = (1 + margin) / total
        adj_prob_a = prob_a * margin_factor
        adj_prob_b = prob_b * margin_factor

        results.append({
            "player_a": a_key,
            "player_b": b_key,
            "true_prob_a": round(prob_a * 100, 1),
            "true_prob_b": round(prob_b * 100, 1),
            "odds_a": round(1 / adj_prob_a, 2),
            "odds_b": round(1 / adj_prob_b, 2),
            "overround": round((adj_prob_a + adj_prob_b) * 100, 1),
            "elo_diff": pred["elo_diff"],
        })

    return results


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    # Example: Process some matches from the tournament
    sample_matches = [
        ("BERKAY", "OKAN", 3, 0),
        ("ALICAN", "OKAN", 3, 0),
        ("BERKAY", "ALICAN", 3, 0),
        ("EKIN", "BERKAY", 3, 1),  # Upset
    ]

    players = process_tournament(sample_matches)

    # Print ratings
    sorted_players = sorted(
        players.values(), key=lambda p: p.rating, reverse=True
    )

    print("=" * 60)
    print("   DYNAMIC ELO RATINGS (K=32 base, dynamic adjustments)")
    print("=" * 60)
    for i, p in enumerate(sorted_players, 1):
        print(
            f"  {i}. {p.name:<12} "
            f"Elo: {p.rating:7.1f}  "
            f"W-L: {p.wins}-{p.losses}  "
            f"K_current: {K_BASE * games_decay(p.matches_played):.1f}"
        )

    # Predict next match
    if "BERKAY" in players and "EKIN" in players:
        print()
        pred = predict_with_odds(players["BERKAY"], players["EKIN"])
        print(f"  Prediction: {pred['player_a']} vs {pred['player_b']}")
        print(f"  Probabilities: {pred['prob_a']}% vs {pred['prob_b']}%")
        print(f"  Decimal odds: {pred['odds_a']} vs {pred['odds_b']}")
```

### 5.3 Pseudocode for Integration with Existing Predictor

To integrate into the existing `predictor.py` which currently uses static Elo estimation:

```
BEFORE (current approach):
  1. Read final standings (wins, losses, point_diff)
  2. Calculate static Elo: BASE + win_rate * 600 + avg_diff * 8
  3. Use Elo for predictions

AFTER (dynamic Elo approach):
  1. Load all match data from match_data.py (in chronological order)
  2. Initialize all players at BASE_ELO = 1500
  3. Process each match sequentially:
     a. Calculate K_effective for both players
     b. Update both ratings using standard Elo formula
     c. Record rating history for analysis
  4. Use final dynamic ratings for predictions
  5. Optionally apply recency weighting (recent matches matter more)
```

### 5.4 Elo Difference to Win Probability Quick Reference

For fast odds mental model:

| Elo Difference | Favorite Win % | Underdog Win % | Decimal Odds (Fav) | Decimal Odds (Dog) |
|---|---|---|---|---|
| 0 | 50.0% | 50.0% | 2.00 | 2.00 |
| 50 | 57.1% | 42.9% | 1.75 | 2.33 |
| 100 | 64.0% | 36.0% | 1.56 | 2.78 |
| 150 | 70.3% | 29.7% | 1.42 | 3.37 |
| 200 | 75.9% | 24.1% | 1.32 | 4.15 |
| 250 | 80.8% | 19.2% | 1.24 | 5.21 |
| 300 | 84.9% | 15.1% | 1.18 | 6.62 |
| 400 | 90.9% | 9.1% | 1.10 | 10.99 |

### 5.5 Rating Scale Interpretation for Your Tournament

Based on the 20-player pool with K=32 dynamic:

| Rating Range | Meaning | Expected Players |
|---|---|---|
| 1700+ | Dominant (top 1-2) | Berkay, Alican |
| 1600-1700 | Strong contender (top 3-7) | Seckin, Ekin, Baran, Erkut, Muzaffer |
| 1500-1600 | Mid-table (positions 8-12) | Ali, Ece, Yasar, Emre, Busra |
| 1400-1500 | Below average (positions 13-16) | Nurten, Yusuf, Havva, Selda |
| 1300-1400 | Struggling (positions 17-18) | Ata, Mehmet |
| Below 1300 | Bottom (positions 19-20) | Veli, Okan |

---

## 6. Validation Strategy

### 6.1 Backtesting with Match Data

Use the existing 190+ recorded matches to validate K-factor choices:

```
For each candidate K in [16, 20, 24, 28, 32, 36, 40, 48]:
  1. Initialize all players at 1500
  2. For each match in chronological order:
     a. Record the prediction BEFORE updating ratings
     b. Update ratings with K
     c. Track: predicted winner correct? Brier score? Log-loss?
  3. Calculate aggregate metrics:
     - Accuracy: % of correctly predicted winners
     - Brier score: mean((predicted_prob - actual_outcome)^2)
     - Log-loss: -mean(actual * log(predicted) + (1-actual) * log(1-predicted))
  4. Compare metrics across K values
```

**Expected result:** K in the range 28-40 should minimize Brier score / log-loss for this tournament. Very low K (16) will underreact to upsets; very high K (48+) will overreact to noise.

### 6.2 Cross-Validation

Split the 38 rounds into training (first 25 rounds) and test (last 13 rounds):

1. Train ratings using rounds 1-25
2. Predict rounds 26-38 outcomes
3. Measure predictive accuracy on unseen data
4. Repeat with different K values

### 6.3 Calibration Check

Group predictions into buckets and verify calibration:

```
For predictions where model says "60-65% win probability":
  - Actual win rate should be close to 62.5%
  - If actual is 75%, model is under-confident (K too low)
  - If actual is 50%, model is over-confident (K too high)
```

### 6.4 Recommended Validation Metrics

| Metric | Target | Description |
|---|---|---|
| Accuracy | > 65% | Correctly picks the winner |
| Brier Score | < 0.22 | Measures probability calibration (lower is better; 0.25 = coin flip) |
| Log-Loss | < 0.65 | Information-theoretic calibration measure |
| Calibration Slope | 0.9-1.1 | Predicted probabilities match actual frequencies |

For reference, the FDI (Faria Darting Index) achieves ~70% accuracy on professional darts. For an amateur tournament with higher variance, 65-68% accuracy would indicate a well-tuned system.

---

## 7. Sources

### Academic Research
- [MSE-optimal K-factor of the Elo rating system for round-robin tournament](https://www.degruyterbrill.com/document/doi/10.1515/jqas-2021-0079/html) - Chan, V. (2022). Journal of Quantitative Analysis in Sports, 18(1), 59-72.
- [On the convergence of the Elo rating system](https://hal.science/hal-03286065/document) - Mathematical convergence analysis for round-robin tournaments.
- [Stochastic analysis of the Elo rating algorithm in round-robin tournaments](https://arxiv.org/html/2212.12015) - Comprehensive stochastic model of Elo behavior.
- [Optimizing K-factor in Elo Rating Systems](https://journals.flvc.org/UFJUR/article/view/138738) - University of Florida Journal of Undergraduate Research, Monte Carlo simulation approach.

### Darts-Specific Implementations
- [DartsRec Elo Ratings](https://www.dartsrec.com/power-rankings) - Live Elo for darts, K=24/32 by tournament tier.
- [FDI Rankings Explained (Darts Orakel)](https://dartsorakel.com/blog/2022/04/23/what-are-fdi-rankings-and-how-are-they-determined/) - Faria Darting Index methodology, 10,000+ players, ~70% predictive accuracy.

### K-Factor Methodology
- [Tuning the Elo ratings: The K-factor and home field advantage](https://opisthokonta.net/?p=1387) - Grid-search optimization for English Premier League, optimal K=18.5-19.5.
- [Elo K-Factor Tweaks (Ultimate Tennis Statistics)](https://www.ultimatetennisstatistics.com/blog/eloKfactorTweaks) - Multi-factor K with tournament level, round, and format adjustments.
- [Understanding the K-Factor in Elo Ratings](https://chess-elo.com/k-factor-elo-ratings/) - FIDE and USCF K-factor tiers explained.
- [Elo Ratings Part 2 -- Margin of Victory Adjustments](http://andr3w321.com/elo-ratings-part-2-margin-of-victory-adjustments/) - FiveThirtyEight MOV formula and autocorrelation correction.

### Rating Systems Comparison
- [Elo rating system (Wikipedia)](https://en.wikipedia.org/wiki/Elo_rating_system) - Comprehensive overview of K-factor approaches across sports.
- [World Football Elo Ratings](https://en.wikipedia.org/wiki/World_Football_Elo_Ratings) - Tournament-weighted K=20-60 with MOV multiplier.
- [Glicko rating system (Wikipedia)](https://en.wikipedia.org/wiki/Glicko_rating_system) - Alternative to Elo with built-in rating deviation tracking.

### Darts Statistics
- [Understanding Your 3 Dart Average in Darts 501](https://a-zdarts.com/blogs/all/understanding-your-3-dart-average-in-darts-501) - Amateur vs professional averages (30-70 vs 85-105).
- [Are Darts Players Getting Better?](https://www.dartscorner.com/blogs/darts-fun/are-darts-players-getting-better) - Professional average trends and variance.
- [The Ultimate Darts Betting Guide 2025](https://outplayed.com/blog/darts-betting-guide) - Favorite win rates (72-78%) and format impact on upsets.
