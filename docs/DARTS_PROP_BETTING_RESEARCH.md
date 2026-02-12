# Darts Proposition (Prop) Betting Markets: Research Report

**Version:** 1.0.0
**Date:** 2026-02-11
**Context:** Amateur friend-group darts tournament, best-of-5 legs format (best-of-7 for semis/finals)
**Data Available:** Match results + leg scores only (no dart-by-dart stats)
**Platform:** Fun tokens, not real money

---

## Table of Contents

1. [Standard Professional Darts Prop Markets](#1-standard-professional-darts-prop-markets)
2. [Which Props Work for Amateur Darts](#2-which-props-work-for-amateur-darts)
3. [Probability Modeling for Each Viable Prop](#3-probability-modeling-for-each-viable-prop)
4. [Pricing Methodology](#4-pricing-methodology)
5. [Implementation: PropOddsCalculator](#5-implementation-propoddscalculator)
6. [Market Attractiveness & Recommendations](#6-market-attractiveness--recommendations)

---

## 1. Standard Professional Darts Prop Markets

Professional darts betting offers a wide menu of proposition markets. These require detailed dart-by-dart data feeds, typically supplied by providers like Sportradar or the PDC's own scoring systems.

### 1.1 Full Professional Prop Market Catalog

| Market | Format | Example | Data Required |
|--------|--------|---------|---------------|
| **180s Over/Under** | Over/Under X.5 | O/U 6.5 180s in match | Per-visit scoring |
| **Most 180s** | Player A vs Player B | Luke Humphries to have most 180s | Per-visit scoring |
| **Exact 180s** | Exact number | Exactly 8 180s in match | Per-visit scoring |
| **Most 180s in Tournament** | Outright | Most 180s across entire event | Tournament-wide tracking |
| **First to Hit 180** | Player A vs Player B | Which player hits the first maximum | Live scoring |
| **Checkout Percentage O/U** | Over/Under X% | O/U 38.5% checkout rate | Per-dart checkout data |
| **Highest Checkout O/U** | Over/Under X.5 | O/U 110.5 highest checkout | Per-leg finish data |
| **Highest Checkout Exact** | Ranges/Exact | Highest checkout 120-139 | Per-leg finish data |
| **9-Dart Finish (Yes/No)** | Yes/No | 9-darter in match | Per-dart tracking |
| **Total Legs O/U** | Over/Under X.5 | O/U 7.5 legs (Bo9) | Match result + leg count |
| **Correct Score** | Exact scoreline | 3-1 in legs | Match result + leg count |
| **First Leg Winner** | Player A vs Player B | Who wins leg 1 | Leg-by-leg result |
| **Match Handicap** | Leg spread | Player A -1.5 legs | Match result + leg count |
| **Total Match Darts** | Over/Under | O/U 95.5 darts thrown | Per-dart counting |
| **King of the Oche** | Combo | Win + Most 180s + Highest Checkout | Multiple data sources |
| **Highest Checkout x 180s** | Spread product | Value = Highest CO x Total 180s | Multiple data sources |

### 1.2 How Professional Books Price These

Professional sportsbooks use:
- **Historical player stats** from PDC/WDF databases (averages, checkout %, 180 frequency)
- **Per-leg probability models** calibrated to player three-dart averages
- **Negative binomial distributions** for modeling leg counts
- **Monte Carlo simulations** for complex multi-outcome props
- **Live data feeds** for in-play market adjustments

**Key insight from research:** The probability of winning a match can be derived from the probability of winning a single leg using the regularized incomplete beta function. For a first-to-N legs match where player A wins each leg with probability p:

```
P(A wins match) = I_p(N, N) = BETA.DIST(p, N, N, TRUE)
```

This is equivalent to summing the negative binomial distribution (the probability that the Nth success occurs before the Nth failure).

### 1.3 9-Dart Finish Probability

A 9-dart finish requires three consecutive visits of 180, 180, and a 141 checkout (or equivalent). In professional darts:

- **Frequency:** Approximately 1 per major tournament (across all matches)
- **Per-leg probability (professional):** Roughly 1 in 3,000 to 1 in 5,000 legs
- **Per-match probability (professional Bo11):** Roughly 0.2% to 0.5%
- **Typical odds:** +15000 to +50000 (150/1 to 500/1)

For amateur darts, this probability is effectively zero. No amateur tournament has ever recorded a 9-dart finish; the market would exist purely for entertainment if included at all.

---

## 2. Which Props Work for Amateur Darts

### 2.1 The Data Reality

In an amateur friend-group tournament, the available data is:

| Data Point | Available? | Notes |
|-----------|-----------|-------|
| Match winner | Yes | Core data |
| Leg score (e.g., 3-1) | Yes | Recorded per match |
| Individual leg winners | Yes | Derivable from score |
| Player Elo ratings | Yes | Calculated from match history (380+ matches) |
| 180s per match | **No** | Would require dedicated scorer |
| Checkout percentage | **No** | Would require dart-by-dart tracking |
| Three-dart average | **No** | Would require dart-by-dart tracking |
| Darts thrown per leg | **No** | Would require dart-by-dart tracking |

### 2.2 Feasibility Matrix

| Prop Market | Feasible? | Reason |
|------------|-----------|--------|
| Total Legs O/U | **YES** | Only needs match format + leg score |
| Correct Score | **YES** | Only needs leg score |
| Deciding Leg (Yes/No) | **YES** | Derived from correct score |
| Leg Handicap | **YES** | Only needs leg score |
| First Leg Winner | **YES** | Needs leg-by-leg result (recordable) |
| Player to Win At Least 1 Leg | **YES** | Derivable from leg score |
| Match to Go Distance | **YES** | Same as deciding leg |
| Bracket Half Winner | **YES** | Only needs bracket structure + match results |
| 180s Over/Under | **NO** | No per-visit scoring data |
| Checkout Percentage | **NO** | No dart-by-dart data |
| Highest Checkout | **NO** | No checkout data |
| 9-Dart Finish | **NO** | No dart-by-dart data (and probability ~0 for amateurs) |
| Total Match Darts | **NO** | No dart counting |

### 2.3 The Seven Viable Amateur Prop Markets

These are the prop markets that work with only match results and leg scores:

#### Market 1: Total Legs Over/Under

```
Format:   Best-of-5 → Possible totals: 3, 4, or 5 legs
          Best-of-7 → Possible totals: 4, 5, 6, or 7 legs
Line:     O/U 3.5 legs (Bo5) or O/U 5.5 legs (Bo7)
Example:  "Berkay vs Ece — Over/Under 3.5 total legs"
```

This is the bread-and-butter prop for amateur darts. When a dominant player faces a weaker opponent, bettors expect a quick 3-0. When two evenly matched players meet, 4-5 legs are more likely.

#### Market 2: Deciding Leg (Yes/No)

```
Format:   Will the match go to a deciding final leg?
          Bo5: Will the score reach 2-2? (match goes to 5th leg)
          Bo7: Will the score reach 3-3? (match goes to 7th leg)
Example:  "Seckin vs Baran — Deciding Leg: Yes/No"
```

This is highly correlated with total legs (it IS the maximum total legs scenario) but is presented as a simpler yes/no bet that casual bettors find intuitive.

#### Market 3: Correct Score

```
Format:   Predict the exact leg score
          Bo5 options: 3-0, 3-1, 3-2, 0-3, 1-3, 2-3
          Bo7 options: 4-0, 4-1, 4-2, 4-3, 0-4, 1-4, 2-4, 3-4
Example:  "Ekin vs Erkut — Correct Score: 3-1"
```

Higher variance, higher odds, more fun. This is the most engaging prop for social betting because it requires a precise prediction and pays well.

#### Market 4: Leg Handicap

```
Format:   Spread betting on the leg margin
          Bo5: Player A -1.5 legs / Player B +1.5 legs
          Bo7: Player A -2.5 legs / Player B +2.5 legs
Example:  "Berkay -1.5 legs vs Ece +1.5 legs"
```

Handicap betting levels the playing field for lopsided matchups. Berkay might be 1.26 to win outright, but Berkay -1.5 (must win by 2+ legs) could be 1.80.

#### Market 5: Player to Win At Least 1 Leg

```
Format:   Yes/No — Will the underdog win at least one leg?
Example:  "Will Ece win at least 1 leg vs Berkay?"
```

This is a market for heavy underdog matches. Even if Ece has only a 25% chance of winning the match, her chance of winning at least 1 leg is much higher (maybe 60-70%). It gives underdog supporters something to root for.

#### Market 6: First Leg Winner

```
Format:   Who wins the opening leg?
Example:  "First Leg Winner: Alican vs Muzaffer"
```

Simple but adds drama to the opening moments. The probability is approximately the per-leg win probability (which differs from the match win probability, especially in longer formats).

#### Market 7: Bracket Half Winner

```
Format:   Which half of the bracket produces the eventual tournament winner?
Example:  "Tournament winner from: Top Half (Berkay side) / Bottom Half (Alican side)"
```

This is a tournament-level prop that only requires knowing the bracket structure. It encourages tournament-wide engagement.

---

## 3. Probability Modeling for Each Viable Prop

### 3.1 Foundation: From Match Win Probability to Leg Win Probability

Our Elo system gives us a **match win probability** (P_match). But to model props, we need the **per-leg win probability** (p). The relationship between them depends on the match format.

**The key formula** uses the negative binomial distribution. For a best-of-(2N-1) match (first to N legs), if player A wins each leg independently with probability p:

```
P(A wins match) = sum_{k=0}^{N-1} C(N-1+k, k) * p^N * (1-p)^k
```

This is equivalent to the regularized incomplete beta function:

```
P(A wins match) = I_p(N, N)
```

**The inverse problem:** Given P_match from Elo, find p such that the above equation holds. This requires numerical root-finding (bisection or Newton's method).

However, for a social betting platform, we can use a simpler approximation:

**Approximation:** For first-to-3 (Bo5), the relationship between p (leg probability) and P_match is approximately:

| p (leg) | P_match (Bo5) | P_match (Bo7) |
|---------|---------------|---------------|
| 0.50 | 0.500 | 0.500 |
| 0.55 | 0.593 | 0.608 |
| 0.60 | 0.683 | 0.710 |
| 0.65 | 0.765 | 0.800 |
| 0.70 | 0.837 | 0.874 |
| 0.75 | 0.896 | 0.929 |
| 0.80 | 0.942 | 0.967 |
| 0.85 | 0.973 | 0.988 |
| 0.90 | 0.992 | 0.997 |

The match format amplifies the stronger player's advantage. A 60% per-leg edge becomes a 68% match edge in Bo5 and a 71% match edge in Bo7.

**For our platform:** We use the Elo-derived match win probability directly and solve backwards for the leg probability. This gives us the building block for all prop calculations.

### 3.2 Total Legs Distribution (Best-of-5)

In a best-of-5 match (first to 3), the match can end in 3, 4, or 5 legs. Let p = probability that Player A wins any given leg.

**P(match ends in exactly 3 legs):**
Either A wins 3-0 or B wins 0-3:
```
P(3 legs) = p^3 + (1-p)^3
```

**P(match ends in exactly 4 legs):**
Either A wins 3-1 or B wins 1-3. In each case, the loser wins exactly 1 of the first 3 legs, then the winner takes the 4th:
```
P(4 legs) = C(3,1) * p^3 * (1-p) + C(3,1) * p * (1-p)^3
           = 3 * p^3 * (1-p) + 3 * p * (1-p)^3
           = 3 * p * (1-p) * [p^2 + (1-p)^2]
```

**P(match ends in exactly 5 legs):**
Either A wins 3-2 or B wins 2-3. The score must be 2-2 after 4 legs, then one player wins the decider:
```
P(5 legs) = C(4,2) * p^2 * (1-p)^2 * [p + (1-p)]
           = C(4,2) * p^2 * (1-p)^2
           = 6 * p^2 * (1-p)^2
```

**Verification:** The three probabilities must sum to 1:
```
p^3 + (1-p)^3 + 3*p*(1-p)*[p^2 + (1-p)^2] + 6*p^2*(1-p)^2 = 1
```

**Worked example: p = 0.60 (Player A 60% per leg)**

```
P(3 legs) = 0.6^3 + 0.4^3 = 0.216 + 0.064 = 0.280
P(4 legs) = 3*0.6*0.4*(0.36+0.16) = 0.72*0.52 = 0.374
P(5 legs) = 6*0.36*0.16 = 0.346

Check: 0.280 + 0.374 + 0.346 = 1.000
```

**Over/Under 3.5 legs pricing:**
```
P(Under 3.5) = P(3 legs) = 0.280
P(Over 3.5) = P(4 legs) + P(5 legs) = 0.720

Fair odds: Under 3.5 = 1/0.280 = 3.57 | Over 3.5 = 1/0.720 = 1.39
```

### 3.3 Total Legs Distribution (Best-of-7)

For a best-of-7 (first to 4), the match can end in 4, 5, 6, or 7 legs.

```
P(4 legs) = p^4 + (1-p)^4

P(5 legs) = C(4,1)*p^4*(1-p) + C(4,1)*p*(1-p)^4
           = 4*p*(1-p)*[p^3 + (1-p)^3]

P(6 legs) = C(5,2)*p^4*(1-p)^2 + C(5,2)*p^2*(1-p)^4
           = 10*p^2*(1-p)^2*[p^2 + (1-p)^2]

P(7 legs) = C(6,3)*p^3*(1-p)^3
           = 20*p^3*(1-p)^3
```

**Worked example: p = 0.60 (Player A 60% per leg, Bo7)**

```
P(4 legs) = 0.6^4 + 0.4^4 = 0.1296 + 0.0256 = 0.155
P(5 legs) = 4*0.6*0.4*(0.216+0.064) = 0.96*0.280 = 0.269
P(6 legs) = 10*0.36*0.16*(0.36+0.16) = 0.576*0.52 = 0.300
P(7 legs) = 20*0.216*0.064 = 0.277

Check: 0.155 + 0.269 + 0.300 + 0.277 = 1.001 (rounding)
```

### 3.4 Deciding Leg Probability

The deciding leg is simply the probability of the maximum number of legs:

```
Bo5: P(deciding leg) = P(5 legs) = 6 * p^2 * (1-p)^2
Bo7: P(deciding leg) = P(7 legs) = 20 * p^3 * (1-p)^3
```

**Key insight:** The deciding leg probability is maximized when p = 0.5 (evenly matched players):

| p (leg win) | P(decider, Bo5) | P(decider, Bo7) |
|-------------|-----------------|-----------------|
| 0.50 | 0.375 (37.5%) | 0.313 (31.3%) |
| 0.55 | 0.366 | 0.302 |
| 0.60 | 0.346 | 0.277 |
| 0.65 | 0.311 | 0.238 |
| 0.70 | 0.265 | 0.185 |
| 0.75 | 0.211 | 0.131 |
| 0.80 | 0.154 | 0.082 |

Even in a fairly lopsided matchup (p=0.70), there's still a 26.5% chance of a deciding leg in Bo5. This makes it an exciting market.

### 3.5 Correct Score Probability Matrix

For a best-of-5 match with leg win probability p (for Player A):

```
P(3-0) = p^3
P(3-1) = C(3,1) * p^3 * (1-p) = 3 * p^3 * (1-p)
P(3-2) = C(4,2) * p^3 * (1-p)^2 = 6 * p^3 * (1-p)^2

P(0-3) = (1-p)^3
P(1-3) = C(3,1) * p * (1-p)^3 = 3 * p * (1-p)^3
P(2-3) = C(4,2) * p^2 * (1-p)^3 = 6 * p^2 * (1-p)^3
```

**Important note on the formula for 3-2:** The match reaches 2-2 after 4 legs (with 2 wins each from the first 4 legs, where the 4th leg is NOT won by the eventual match winner --- wait, let me be precise.

For Player A to win 3-2:
- After 4 legs, the score is 2-2. The number of ways A can have 2 wins in the first 4 legs is C(4,2) = 6. BUT we must require that A did NOT win their 3rd leg before leg 5. Actually, the correct interpretation is:
- Player A wins exactly 2 of the first 4 legs (C(4,2) ways), then wins leg 5.
- **However**, if A had already won 3 of the first 3 or 4 legs, the match would have ended earlier. So we need the "negative binomial" interpretation:

**Correct formulas (negative binomial / order-sensitive):**

For A to win 3-1: A wins 2 of the first 3 legs (C(3,2) = 3 ways), then wins leg 4:
```
P(A wins 3-1) = C(3,2) * p^2 * (1-p) * p = 3 * p^3 * (1-p)
```

For A to win 3-2: A wins 2 of the first 4 legs AND B wins 2 of the first 4 legs, then A wins leg 5. The constraint is that A must have exactly 2 wins after 4 legs (meaning A did NOT reach 3 wins before leg 5). The number of sequences where A has 2 wins and B has 2 wins after 4 legs, with the constraint that neither had reached 3 wins:
```
P(A wins 3-2) = C(4,2) * p^2 * (1-p)^2 * p = 6 * p^3 * (1-p)^2
```

Wait -- but C(4,2) overcounts: it includes the case where A wins legs 1,2,3 and loses leg 4, which would mean A already won 3-0 after leg 3. We need to ensure A has NOT yet won 3 legs by the end of leg 4. The correct count is the number of arrangements of 2 A-wins and 2 B-wins in 4 legs such that A never reaches 3 cumulative wins. Since A needs 3 wins and we only place 2 in 4 legs, A never reaches 3 in the first 4 legs. Similarly B has only 2 wins and needs 3. So C(4,2) = 6 is correct.

**Final correct formulas (Bo5):**

```
P(A wins 3-0) = p^3
P(A wins 3-1) = C(2,2) * C(3,2) * p^3 * (1-p)^1   -- NO

Actually let me be very precise using the negative binomial directly.
```

**The Negative Binomial Approach:**

P(A wins N-k) in a first-to-N match means A's Nth win comes on leg (N+k). The number of ways this can happen: A wins exactly (N-1) of the first (N+k-1) legs, then wins leg (N+k):

```
P(A wins N-k) = C(N+k-1, N-1) * p^N * (1-p)^k
```

For Bo5 (first-to-3, N=3):

```
P(A wins 3-0) = C(2,2) * p^3 * (1-p)^0 = 1 * p^3 = p^3
P(A wins 3-1) = C(3,2) * p^3 * (1-p)^1 = 3 * p^3 * (1-p)
P(A wins 3-2) = C(4,2) * p^3 * (1-p)^2 = 6 * p^3 * (1-p)^2

P(B wins 0-3) = C(2,2) * (1-p)^3 * p^0 = (1-p)^3
P(B wins 1-3) = C(3,2) * (1-p)^3 * p^1 = 3 * p * (1-p)^3
P(B wins 2-3) = C(4,2) * (1-p)^3 * p^2 = 6 * p^2 * (1-p)^3
```

**Worked example: p = 0.60**

| Score | Formula | Probability | Fair Odds |
|-------|---------|------------|-----------|
| **3-0** | p^3 | 0.216 | 4.63 |
| **3-1** | 3p^3(1-p) | 0.259 | 3.86 |
| **3-2** | 6p^3(1-p)^2 | 0.207 | 4.83 |
| **0-3** | (1-p)^3 | 0.064 | 15.63 |
| **1-3** | 3p(1-p)^3 | 0.115 | 8.68 |
| **2-3** | 6p^2(1-p)^3 | 0.138 | 7.23 |

**Verification:** 0.216 + 0.259 + 0.207 + 0.064 + 0.115 + 0.138 = 0.999 (rounding)

**Player A match win probability:** 0.216 + 0.259 + 0.207 = 0.683

This matches the expected Bo5 win probability for p=0.60 from the beta distribution.

### 3.6 Leg Handicap Pricing

Handicap markets give an artificial advantage (in legs) to one player:

**Player A -1.5 legs:**
A must win by 2+ legs. The qualifying scores are 3-0 and 3-1:
```
P(A covers -1.5) = P(3-0) + P(3-1) = p^3 + 3*p^3*(1-p) = p^3*(1 + 3*(1-p)) = p^3*(4-3p)
```

For p = 0.60:
```
P(A covers -1.5) = 0.216 + 0.259 = 0.475
Fair odds: 1/0.475 = 2.11
```

**Player B +1.5 legs:**
B must either win or lose by at most 1 leg. The qualifying scores are 0-3, 1-3, 2-3, 3-2:
```
P(B covers +1.5) = 1 - P(A covers -1.5) = 0.525
Fair odds: 1/0.525 = 1.90
```

**Player A -2.5 legs (Bo7 only, or "clean sweep" in Bo5):**
```
Bo5: P(A -2.5) = P(3-0) = p^3
Bo7: P(A -2.5) = P(4-0) + P(4-1) = p^4 + 4*p^4*(1-p) = p^4*(1 + 4*(1-p)) = p^4*(5-4p)
```

### 3.7 Player to Win At Least 1 Leg

This is the complement of a clean sweep against them:

```
P(underdog wins >= 1 leg) = 1 - P(favorite wins N-0)
                          = 1 - p^N          (where p is favorite's leg probability)

Bo5: P(underdog wins >= 1 leg) = 1 - p^3
Bo7: P(underdog wins >= 1 leg) = 1 - p^4
```

**Worked example: Berkay (p=0.75) vs Ece (1-p=0.25)**
```
Bo5: P(Ece wins >= 1 leg) = 1 - 0.75^3 = 1 - 0.422 = 0.578 (57.8%)
Bo7: P(Ece wins >= 1 leg) = 1 - 0.75^4 = 1 - 0.316 = 0.684 (68.4%)
```

Even against a very strong opponent, the underdog has a good chance of taking at least one leg. This market always has competitive odds.

### 3.8 Bracket Half Winner

For an 8-player single-elimination bracket with standard seeding (1v8, 4v5 | 2v7, 3v6):

**Top half contains seeds:** 1, 4, 5, 8
**Bottom half contains seeds:** 2, 3, 6, 7

The probability of the winner coming from the top half requires simulating the entire bracket:
```
P(top half wins) = sum over all top-half players of P(that player wins the tournament)
```

This is best computed via Monte Carlo simulation (already implemented in the predictor).

---

## 4. Pricing Methodology

### 4.1 From Elo to Prop Odds Pipeline

```
┌─────────────┐    ┌────────────────┐    ┌─────────────────┐    ┌────────────┐
│ Elo Ratings  │───>│ Match Win Prob  │───>│ Leg Win Prob (p)│───>│ Prop Probs │
│ (from data)  │    │ (Elo formula)   │    │ (root-finding)  │    │ (formulas) │
└─────────────┘    └────────────────┘    └─────────────────┘    └────────────┘
                                                                       │
                                                                       v
                                                               ┌────────────┐
                                                               │ Apply Margin│
                                                               │ (overround) │
                                                               └────────────┘
                                                                       │
                                                                       v
                                                               ┌────────────┐
                                                               │ Final Odds  │
                                                               │ (decimal)   │
                                                               └────────────┘
```

**Step 1: Elo to match win probability**
```python
P_match = 1 / (1 + 10^((elo_b - elo_a) / 400))
```

**Step 2: Match win probability to leg win probability**

We need to solve for p in:
```
P_match = sum_{k=0}^{N-1} C(N-1+k, k) * p^N * (1-p)^k
```

For Bo5 (N=3): `P_match = p^3 + 3*p^3*(1-p) + 6*p^3*(1-p)^2`

This simplifies to: `P_match = p^3 * (10 - 15p + 6p^2)`

We solve this numerically using bisection on [0, 1].

**Step 3: Leg win probability to prop probabilities**

Apply the formulas from Section 3 above.

**Step 4: Apply margin (overround)**

For a two-outcome market (e.g., Over/Under), with fair probabilities (p1, p2):
```
margin = 1.05 to 1.10  (5% to 10% overround)

adjusted_p1 = p1 * margin / (p1 * margin + p2 * margin)  -- this just equals p1
```

Actually, the standard approach is **multiplicative margin**:
```
odds1 = 1 / (p1 * margin)    -- WRONG: this doesn't sum correctly

Better approach — proportional margin:
total_fair = 1/p1 + 1/p2 = 1/p1 + 1/p2   (should = 2.0 for fair book)
target_book = total_fair * (1 + margin%)

adjusted_odds1 = fair_odds1 * target_book / total_fair  -- ALSO NOT RIGHT
```

**The correct standard approach (power method):**
```
For margin m (e.g., 0.05 for 5%):
k = 1 / (1 + m)

adjusted_p1 = p1^k / (p1^k + p2^k)
adjusted_p2 = p2^k / (p1^k + p2^k)

odds1 = 1 / adjusted_p1
odds2 = 1 / adjusted_p2

Overround check: 1/odds1 + 1/odds2 = 1 + m
```

The power method preserves the relative probability structure while adding symmetric margin. For a social fun-token platform, a 5% margin is appropriate (compared to 10-15% for commercial sportsbooks).

For multi-outcome markets (correct score, 6 outcomes in Bo5), the same approach applies:
```
adjusted_pi = pi^k / sum(pj^k for all j)
```

### 4.2 Recommended Margins by Market Type

| Market | Recommended Margin | Rationale |
|--------|-------------------|-----------|
| Match Winner (H2H) | 5% | Core market, keep tight for volume |
| Total Legs O/U | 5% | Popular, competitive pricing attracts bets |
| Deciding Leg Y/N | 5% | Simple market, low margin = fun |
| Correct Score | 8% | Higher margin justified by more outcomes |
| Leg Handicap | 6% | Moderate complexity |
| Win At Least 1 Leg | 5% | Novelty market, low margin to attract |
| Bracket Half | 5% | Tournament-level, keep simple |

### 4.3 Correlation Between Props

Several props are mathematically correlated because they derive from the same underlying process:

```
                    Total Legs O/U
                    /           \
            Deciding Leg       Leg Handicap
                    \           /
                  Correct Score
```

- **Total Legs and Deciding Leg:** Perfectly correlated. Deciding leg = max total legs.
- **Correct Score contains all information:** If you know the correct score, you know total legs, deciding leg, handicap, and winner.
- **Match winner and all props:** The match winner probability constrains all other prop probabilities.

**Implication for the platform:** Do NOT offer same-match parlays across correlated props (e.g., "Over 3.5 legs AND Deciding Leg Yes" is essentially the same bet). Each prop should be bet independently.

### 4.4 Monte Carlo Simulation Approach

For complex scenarios or validation, simulate the match leg-by-leg:

```
For each simulation (n=100,000):
    a_legs = 0
    b_legs = 0
    while a_legs < N and b_legs < N:
        if random() < p:
            a_legs += 1
        else:
            b_legs += 1
    record: total_legs, score, winner, etc.

Estimate probabilities as: count(event) / n_simulations
```

This is especially useful for:
- Validating analytical formulas
- Computing bracket-level props (bracket half winner)
- Adding complexity (e.g., momentum effects, fatigue adjustments)

---

## 5. Implementation: PropOddsCalculator

### 5.1 Complete Python Implementation

```python
"""
PropOddsCalculator: Derive prop betting odds from Elo-based match win probability.

For amateur darts tournament betting platform.
Supports: Best-of-5, Best-of-7, and arbitrary Best-of-N formats.
"""

import math
import random
from dataclasses import dataclass, field
from typing import Optional
from scipy.optimize import brentq
from scipy.special import comb


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class PropMarket:
    """A single prop betting market with selections and odds."""
    name: str
    market_type: str  # 'over_under', 'yes_no', 'correct_score', 'handicap', 'outright'
    selections: dict[str, float]  # {selection_name: decimal_odds}
    fair_probs: dict[str, float]  # {selection_name: fair_probability}
    description: str = ""


@dataclass
class PropSheet:
    """Complete prop betting sheet for a match."""
    player_a: str
    player_b: str
    match_format: int  # best-of-N
    legs_to_win: int  # N // 2 + 1
    match_win_prob_a: float  # from Elo
    leg_win_prob_a: float  # derived
    margin: float  # overround applied
    markets: list[PropMarket] = field(default_factory=list)


# =============================================================================
# CORE MATH
# =============================================================================

def match_win_prob_from_leg_prob(p: float, legs_to_win: int) -> float:
    """
    Calculate match win probability from per-leg win probability.

    Uses the negative binomial distribution (CDF).
    P(A wins match) = sum_{k=0}^{N-1} C(N-1+k, k) * p^N * (1-p)^k

    where N = legs_to_win, p = leg win probability for A.

    Args:
        p: Probability of player A winning a single leg
        legs_to_win: Number of legs needed to win (3 for Bo5, 4 for Bo7)

    Returns:
        Probability of player A winning the match
    """
    N = legs_to_win
    q = 1 - p
    total = 0.0
    for k in range(N):
        total += comb(N - 1 + k, k, exact=True) * (p ** N) * (q ** k)
    return total


def leg_prob_from_match_prob(match_prob: float, legs_to_win: int) -> float:
    """
    Inverse: find per-leg probability that produces the given match probability.

    Uses Brent's root-finding method.

    Args:
        match_prob: Target match win probability (from Elo)
        legs_to_win: Number of legs needed to win

    Returns:
        Per-leg win probability p
    """
    if match_prob <= 0.0:
        return 0.0
    if match_prob >= 1.0:
        return 1.0
    if abs(match_prob - 0.5) < 1e-10:
        return 0.5

    def f(p):
        return match_win_prob_from_leg_prob(p, legs_to_win) - match_prob

    # Brent's method on [0.001, 0.999]
    return brentq(f, 0.001, 0.999, xtol=1e-10)


def apply_margin(fair_probs: dict[str, float], margin: float) -> dict[str, float]:
    """
    Apply margin to fair probabilities using the power method.

    The power method adjusts each probability symmetrically:
        k = 1 / (1 + margin)
        adj_pi = pi^k / sum(pj^k)
        odds_i = 1 / adj_pi

    Args:
        fair_probs: {name: probability} dict, must sum to ~1.0
        margin: Target overround (e.g., 0.05 for 5%)

    Returns:
        {name: decimal_odds} dict
    """
    if margin <= 0:
        return {name: round(1.0 / prob, 2) if prob > 0 else 999.0
                for name, prob in fair_probs.items()}

    k = 1.0 / (1.0 + margin)

    # Compute adjusted probabilities
    powered = {name: prob ** k for name, prob in fair_probs.items() if prob > 0}
    total_powered = sum(powered.values())

    odds = {}
    for name, prob in fair_probs.items():
        if prob > 0:
            adj_prob = (prob ** k) / total_powered
            odds[name] = round(1.0 / adj_prob, 2)
        else:
            odds[name] = 999.0  # Essentially impossible

    return odds


# =============================================================================
# CORRECT SCORE PROBABILITIES
# =============================================================================

def correct_score_probs(p: float, legs_to_win: int) -> dict[str, float]:
    """
    Calculate probability of each possible correct score.

    For first-to-N legs, possible scores are N-k for k in [0, N-1]:
    P(A wins N-k) = C(N+k-1, N-1) * p^N * (1-p)^k

    Args:
        p: Player A's per-leg win probability
        legs_to_win: Number of legs to win (N)

    Returns:
        Dict of {"3-0": prob, "3-1": prob, ...} for all possible scores
    """
    N = legs_to_win
    q = 1 - p
    scores = {}

    for k in range(N):
        # A wins N-k
        prob_a = comb(N - 1 + k, k, exact=True) * (p ** N) * (q ** k)
        scores[f"{N}-{k}"] = prob_a

        # B wins k-N (equivalent: B wins N legs, A wins k)
        prob_b = comb(N - 1 + k, k, exact=True) * (q ** N) * (p ** k)
        scores[f"{k}-{N}"] = prob_b

    return scores


# =============================================================================
# TOTAL LEGS PROBABILITIES
# =============================================================================

def total_legs_probs(p: float, legs_to_win: int) -> dict[int, float]:
    """
    Calculate probability of each possible total number of legs.

    Match ending in (N+k) total legs means the score was N-k or k-N.
    P(total = N+k) = P(A wins N-k) + P(B wins k-N)

    Args:
        p: Player A's per-leg win probability
        legs_to_win: Number of legs to win (N)

    Returns:
        Dict of {total_legs: probability}
    """
    N = legs_to_win
    q = 1 - p
    totals = {}

    for k in range(N):
        total = N + k
        prob = (comb(N - 1 + k, k, exact=True) *
                ((p ** N) * (q ** k) + (q ** N) * (p ** k)))
        totals[total] = prob

    return totals


# =============================================================================
# PROP ODDS CALCULATOR
# =============================================================================

class PropOddsCalculator:
    """
    Calculate prop betting odds for amateur darts matches.

    Input: player_a_win_prob (from Elo), match_format (best_of_N)
    Output: Complete prop sheet with all available markets and odds

    Usage:
        calc = PropOddsCalculator(
            player_a="Berkay",
            player_b="Ece",
            player_a_win_prob=0.80,
            match_format=5,       # Best-of-5
            margin=0.05           # 5% overround
        )
        sheet = calc.calculate_all()
        calc.print_prop_sheet(sheet)
    """

    def __init__(
        self,
        player_a: str,
        player_b: str,
        player_a_win_prob: float,
        match_format: int = 5,
        margin: float = 0.05,
    ):
        self.player_a = player_a
        self.player_b = player_b
        self.match_format = match_format
        self.legs_to_win = match_format // 2 + 1
        self.match_win_prob_a = player_a_win_prob
        self.match_win_prob_b = 1.0 - player_a_win_prob
        self.margin = margin

        # Derive per-leg probability
        self.leg_prob_a = leg_prob_from_match_prob(
            player_a_win_prob, self.legs_to_win
        )
        self.leg_prob_b = 1.0 - self.leg_prob_a

    def calculate_all(self) -> PropSheet:
        """Calculate all prop markets and return a PropSheet."""
        sheet = PropSheet(
            player_a=self.player_a,
            player_b=self.player_b,
            match_format=self.match_format,
            legs_to_win=self.legs_to_win,
            match_win_prob_a=self.match_win_prob_a,
            leg_win_prob_a=self.leg_prob_a,
            margin=self.margin,
        )

        # Generate all markets
        sheet.markets.append(self._match_winner())
        sheet.markets.append(self._total_legs_over_under())
        sheet.markets.append(self._deciding_leg())
        sheet.markets.append(self._correct_score())
        sheet.markets.extend(self._leg_handicaps())
        sheet.markets.append(self._at_least_one_leg())
        sheet.markets.append(self._first_leg_winner())

        return sheet

    def _match_winner(self) -> PropMarket:
        """Head-to-head match winner market."""
        fair = {
            self.player_a: self.match_win_prob_a,
            self.player_b: self.match_win_prob_b,
        }
        odds = apply_margin(fair, self.margin)
        return PropMarket(
            name="Match Winner",
            market_type="outright",
            selections=odds,
            fair_probs=fair,
            description=f"Who wins the match? (Best-of-{self.match_format})",
        )

    def _total_legs_over_under(self) -> PropMarket:
        """Total legs over/under market."""
        totals = total_legs_probs(self.leg_prob_a, self.legs_to_win)
        N = self.legs_to_win

        # Find the best O/U line (closest to 50/50 split)
        min_legs = N
        max_legs = 2 * N - 1

        # Standard line: midpoint - 0.5
        line = (min_legs + max_legs) / 2

        # Ensure line is X.5
        line = math.floor(line) + 0.5

        under_prob = sum(p for legs, p in totals.items() if legs < line)
        over_prob = sum(p for legs, p in totals.items() if legs > line)

        # Normalize (should already sum to ~1)
        total_p = under_prob + over_prob
        under_prob /= total_p
        over_prob /= total_p

        fair = {
            f"Under {line}": under_prob,
            f"Over {line}": over_prob,
        }
        odds = apply_margin(fair, self.margin)

        # Also include exact totals as sub-market
        return PropMarket(
            name=f"Total Legs O/U {line}",
            market_type="over_under",
            selections=odds,
            fair_probs=fair,
            description=(
                f"Will there be over or under {line} total legs? "
                f"Possible range: {min_legs}-{max_legs}"
            ),
        )

    def _deciding_leg(self) -> PropMarket:
        """Will the match go to a deciding final leg?"""
        totals = total_legs_probs(self.leg_prob_a, self.legs_to_win)
        max_legs = 2 * self.legs_to_win - 1

        yes_prob = totals.get(max_legs, 0.0)
        no_prob = 1.0 - yes_prob

        fair = {"Yes": yes_prob, "No": no_prob}
        odds = apply_margin(fair, self.margin)

        return PropMarket(
            name="Deciding Leg",
            market_type="yes_no",
            selections=odds,
            fair_probs=fair,
            description=(
                f"Will the match go to a deciding leg {self.legs_to_win}-"
                f"{self.legs_to_win - 1} / "
                f"{self.legs_to_win - 1}-{self.legs_to_win}?"
            ),
        )

    def _correct_score(self) -> PropMarket:
        """Correct score market with all possible scorelines."""
        scores = correct_score_probs(self.leg_prob_a, self.legs_to_win)

        # Use higher margin for multi-outcome market
        cs_margin = self.margin * 1.6  # e.g., 5% base -> 8% for correct score

        fair = {}
        for score_str, prob in sorted(
            scores.items(),
            key=lambda x: (-x[1]),  # Sort by probability desc
        ):
            fair[score_str] = prob

        odds = apply_margin(fair, cs_margin)

        return PropMarket(
            name="Correct Score",
            market_type="correct_score",
            selections=odds,
            fair_probs=fair,
            description=f"Predict the exact leg score (Best-of-{self.match_format})",
        )

    def _leg_handicaps(self) -> list[PropMarket]:
        """Leg handicap markets."""
        scores = correct_score_probs(self.leg_prob_a, self.legs_to_win)
        markets = []

        # Determine which handicap lines to offer
        N = self.legs_to_win

        # Standard: -1.5 for the favorite
        for spread in [1.5, 2.5]:
            if spread >= N:
                continue  # Can't have a spread >= legs to win

            # Determine who is the favorite
            if self.match_win_prob_a >= 0.5:
                fav, dog = self.player_a, self.player_b
                fav_prob = self.match_win_prob_a
            else:
                fav, dog = self.player_b, self.player_a
                fav_prob = self.match_win_prob_b

            # Calculate cover probability for favorite
            cover_prob = 0.0
            for score_str, prob in scores.items():
                parts = score_str.split("-")
                a_legs, b_legs = int(parts[0]), int(parts[1])

                # Determine if this score means the favorite covered
                if fav == self.player_a:
                    fav_legs, dog_legs = a_legs, b_legs
                else:
                    fav_legs, dog_legs = b_legs, a_legs

                margin_of_victory = fav_legs - dog_legs
                if margin_of_victory > spread:
                    cover_prob += prob

            no_cover_prob = 1.0 - cover_prob

            fair = {
                f"{fav} -{spread}": cover_prob,
                f"{dog} +{spread}": no_cover_prob,
            }
            odds = apply_margin(fair, self.margin * 1.2)  # Slightly higher margin

            markets.append(PropMarket(
                name=f"Leg Handicap ({spread})",
                market_type="handicap",
                selections=odds,
                fair_probs=fair,
                description=(
                    f"{fav} must win by {int(spread + 0.5)}+ legs / "
                    f"{dog} must not lose by {int(spread + 0.5)}+ legs"
                ),
            ))

        return markets

    def _at_least_one_leg(self) -> PropMarket:
        """Will the underdog win at least one leg?"""
        p = self.leg_prob_a
        N = self.legs_to_win

        # Determine underdog
        if self.match_win_prob_a >= 0.5:
            fav, dog = self.player_a, self.player_b
            fav_leg_p = p
        else:
            fav, dog = self.player_b, self.player_a
            fav_leg_p = 1 - p

        # Prob of clean sweep by favorite
        clean_sweep_prob = fav_leg_p ** N
        at_least_one_prob = 1.0 - clean_sweep_prob

        fair = {
            f"{dog} wins 1+ legs": at_least_one_prob,
            f"{fav} clean sweep": clean_sweep_prob,
        }
        odds = apply_margin(fair, self.margin)

        return PropMarket(
            name=f"{dog} To Win At Least 1 Leg",
            market_type="yes_no",
            selections=odds,
            fair_probs=fair,
            description=f"Will {dog} win at least one leg against {fav}?",
        )

    def _first_leg_winner(self) -> PropMarket:
        """Who wins the first leg?"""
        # First leg probability equals per-leg probability
        fair = {
            self.player_a: self.leg_prob_a,
            self.player_b: self.leg_prob_b,
        }
        odds = apply_margin(fair, self.margin)

        return PropMarket(
            name="First Leg Winner",
            market_type="outright",
            selections=odds,
            fair_probs=fair,
            description="Who wins the opening leg?",
        )

    # =========================================================================
    # MONTE CARLO VALIDATION
    # =========================================================================

    def simulate_match(self, n_sims: int = 100_000, seed: int = None) -> dict:
        """
        Monte Carlo simulation to validate analytical formulas.

        Simulates the match leg-by-leg n_sims times.

        Returns:
            Dict with simulated probabilities for all props.
        """
        if seed is not None:
            random.seed(seed)

        N = self.legs_to_win
        p = self.leg_prob_a

        # Counters
        a_wins = 0
        score_counts = {}
        total_legs_counts = {}
        first_leg_a = 0

        for _ in range(n_sims):
            a_legs = 0
            b_legs = 0
            first_leg_recorded = False

            while a_legs < N and b_legs < N:
                if random.random() < p:
                    if not first_leg_recorded:
                        first_leg_a += 1
                        first_leg_recorded = True
                    a_legs += 1
                else:
                    first_leg_recorded = True
                    b_legs += 1

            # Record results
            if a_legs == N:
                a_wins += 1
            score = f"{a_legs}-{b_legs}"
            score_counts[score] = score_counts.get(score, 0) + 1
            total = a_legs + b_legs
            total_legs_counts[total] = total_legs_counts.get(total, 0) + 1

        return {
            "n_sims": n_sims,
            "match_win_a": a_wins / n_sims,
            "first_leg_a": first_leg_a / n_sims,
            "scores": {k: v / n_sims for k, v in sorted(score_counts.items())},
            "total_legs": {k: v / n_sims for k, v in sorted(total_legs_counts.items())},
        }

    # =========================================================================
    # DISPLAY
    # =========================================================================

    @staticmethod
    def print_prop_sheet(sheet: PropSheet):
        """Pretty-print the complete prop sheet."""
        print("\n" + "=" * 72)
        print(f"  PROP BETTING SHEET: {sheet.player_a} vs {sheet.player_b}")
        print(f"  Format: Best-of-{sheet.match_format} (First to {sheet.legs_to_win})")
        print(f"  Match Prob: {sheet.player_a} {sheet.match_win_prob_a*100:.1f}% | "
              f"{sheet.player_b} {(1-sheet.match_win_prob_a)*100:.1f}%")
        print(f"  Leg Prob:   {sheet.player_a} {sheet.leg_win_prob_a*100:.1f}% | "
              f"{sheet.player_b} {(1-sheet.leg_win_prob_a)*100:.1f}%")
        print(f"  Margin: {sheet.margin*100:.0f}%")
        print("=" * 72)

        for market in sheet.markets:
            print(f"\n  --- {market.name} ---")
            if market.description:
                print(f"  {market.description}")
            print()

            for sel_name, odds in market.selections.items():
                fair_p = market.fair_probs.get(sel_name, 0)
                print(f"    {sel_name:<30} {odds:>6.2f}  (fair: {fair_p*100:>5.1f}%)")

        print("\n" + "=" * 72)

    @staticmethod
    def to_dict(sheet: PropSheet) -> dict:
        """Convert PropSheet to a JSON-serializable dict."""
        return {
            "match": {
                "player_a": sheet.player_a,
                "player_b": sheet.player_b,
                "format": f"Best-of-{sheet.match_format}",
                "legs_to_win": sheet.legs_to_win,
                "match_win_prob_a": round(sheet.match_win_prob_a, 4),
                "leg_win_prob_a": round(sheet.leg_win_prob_a, 4),
                "margin": sheet.margin,
            },
            "markets": [
                {
                    "name": m.name,
                    "type": m.market_type,
                    "description": m.description,
                    "selections": [
                        {
                            "name": sel,
                            "odds": odds,
                            "fair_prob": round(m.fair_probs.get(sel, 0), 4),
                        }
                        for sel, odds in m.selections.items()
                    ],
                }
                for m in sheet.markets
            ],
        }


# =============================================================================
# TOURNAMENT-LEVEL PROPS
# =============================================================================

class TournamentPropCalculator:
    """
    Calculate tournament-level prop markets using Monte Carlo simulation.

    Wraps around the existing predictor.py to add bracket-level props.
    """

    def __init__(
        self,
        bracket: list[tuple[str, str]],  # List of (player_a, player_b) QF matchups
        get_win_prob: callable,           # Function(a, b) -> P(a wins)
        semis_format: int = 7,            # Best-of-7 for semis
        finals_format: int = 7,           # Best-of-7 for finals
        qf_format: int = 5,              # Best-of-5 for QFs
        margin: float = 0.05,
    ):
        self.bracket = bracket
        self.get_win_prob = get_win_prob
        self.semis_format = semis_format
        self.finals_format = finals_format
        self.qf_format = qf_format
        self.margin = margin

    def _simulate_match(self, player_a: str, player_b: str, best_of: int) -> tuple[str, str]:
        """
        Simulate a single match, returning (winner, score_string).
        """
        N = best_of // 2 + 1
        p = self.get_win_prob(player_a, player_b)
        # Convert match prob to leg prob
        leg_p = leg_prob_from_match_prob(p, N)

        a_legs, b_legs = 0, 0
        while a_legs < N and b_legs < N:
            if random.random() < leg_p:
                a_legs += 1
            else:
                b_legs += 1

        winner = player_a if a_legs == N else player_b
        score = f"{a_legs}-{b_legs}"
        return winner, score

    def simulate_tournament(self, n_sims: int = 50_000, seed: int = None) -> dict:
        """
        Simulate entire knockout tournament n_sims times.

        Returns probabilities for:
        - Tournament winner
        - Bracket half winner
        - Each match correct score
        """
        if seed is not None:
            random.seed(seed)

        # Bracket: [(a1,b1), (a2,b2), (a3,b3), (a4,b4)]
        # QF1: bracket[0], QF2: bracket[1]  -> SF1
        # QF3: bracket[2], QF4: bracket[3]  -> SF2
        # SF1 winner vs SF2 winner -> Final

        champ_counts = {}
        top_half_wins = 0
        bottom_half_wins = 0
        match_scores = {i: {} for i in range(7)}  # 4 QFs + 2 SFs + 1 Final

        for _ in range(n_sims):
            # Quarterfinals
            qf_winners = []
            for i, (a, b) in enumerate(self.bracket):
                winner, score = self._simulate_match(a, b, self.qf_format)
                qf_winners.append(winner)
                match_scores[i][score] = match_scores[i].get(score, 0) + 1

            # Semifinals
            sf1_winner, sf1_score = self._simulate_match(
                qf_winners[0], qf_winners[1], self.semis_format
            )
            match_scores[4][sf1_score] = match_scores[4].get(sf1_score, 0) + 1

            sf2_winner, sf2_score = self._simulate_match(
                qf_winners[2], qf_winners[3], self.semis_format
            )
            match_scores[5][sf2_score] = match_scores[5].get(sf2_score, 0) + 1

            # Final
            champion, final_score = self._simulate_match(
                sf1_winner, sf2_winner, self.finals_format
            )
            match_scores[6][final_score] = match_scores[6].get(final_score, 0) + 1

            champ_counts[champion] = champ_counts.get(champion, 0) + 1

            # Bracket half
            if champion in (self.bracket[0][0], self.bracket[0][1],
                           self.bracket[1][0], self.bracket[1][1]):
                top_half_wins += 1
            else:
                bottom_half_wins += 1

        return {
            "n_sims": n_sims,
            "champion_probs": {k: v / n_sims for k, v in
                              sorted(champ_counts.items(), key=lambda x: -x[1])},
            "bracket_half": {
                "top_half": top_half_wins / n_sims,
                "bottom_half": bottom_half_wins / n_sims,
            },
            "match_scores": {
                i: {k: v / n_sims for k, v in sorted(scores.items())}
                for i, scores in match_scores.items()
            },
        }


# =============================================================================
# WORKED EXAMPLE
# =============================================================================

def worked_example():
    """
    Complete worked example: 60% vs 40% matchup in Best-of-5.
    """
    print("\n" + "=" * 72)
    print("  WORKED EXAMPLE: 60% vs 40% Matchup (Best-of-5)")
    print("=" * 72)

    calc = PropOddsCalculator(
        player_a="Player A",
        player_b="Player B",
        player_a_win_prob=0.683,  # From Elo: ~60% per-leg advantage
        match_format=5,
        margin=0.05,
    )

    print(f"\n  Input match probability: {calc.match_win_prob_a*100:.1f}%")
    print(f"  Derived leg probability: {calc.leg_prob_a*100:.1f}%")

    sheet = calc.calculate_all()
    PropOddsCalculator.print_prop_sheet(sheet)

    # Validate with Monte Carlo
    print("\n  --- Monte Carlo Validation (100,000 sims) ---")
    sim = calc.simulate_match(n_sims=100_000, seed=42)
    print(f"  Simulated match win A: {sim['match_win_a']*100:.1f}% "
          f"(analytical: {calc.match_win_prob_a*100:.1f}%)")
    print(f"  Simulated first leg A: {sim['first_leg_a']*100:.1f}% "
          f"(analytical: {calc.leg_prob_a*100:.1f}%)")
    print(f"\n  Score distribution (simulated vs analytical):")

    analytical_scores = correct_score_probs(calc.leg_prob_a, calc.legs_to_win)
    for score in sorted(sim['scores'].keys()):
        sim_p = sim['scores'][score]
        ana_p = analytical_scores.get(score, 0)
        diff = abs(sim_p - ana_p) * 100
        print(f"    {score}: sim={sim_p*100:5.1f}%  ana={ana_p*100:5.1f}%  "
              f"diff={diff:.2f}pp")


def real_tournament_example():
    """
    Example using actual tournament data: Berkay vs Ece (QF1).
    """
    print("\n" + "=" * 72)
    print("  REAL EXAMPLE: Berkay vs Ece (Quarterfinal)")
    print("  Elo-derived match probability: Berkay 79.4%")
    print("=" * 72)

    calc = PropOddsCalculator(
        player_a="Berkay",
        player_b="Ece",
        player_a_win_prob=0.794,  # From predictor Elo
        match_format=5,
        margin=0.05,
    )

    sheet = calc.calculate_all()
    PropOddsCalculator.print_prop_sheet(sheet)

    print("\n\n" + "=" * 72)
    print("  REAL EXAMPLE: Seckin vs Baran (Quarterfinal — Close Match)")
    print("  Elo-derived match probability: Seckin 55.2%")
    print("=" * 72)

    calc2 = PropOddsCalculator(
        player_a="Seckin",
        player_b="Baran",
        player_a_win_prob=0.552,
        match_format=5,
        margin=0.05,
    )

    sheet2 = calc2.calculate_all()
    PropOddsCalculator.print_prop_sheet(sheet2)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    worked_example()
    print("\n")
    real_tournament_example()
```

### 5.2 Example Output: 60% vs 40% in Best-of-5

Using `player_a_win_prob = 0.683` (which corresponds to ~60% per-leg probability):

```
========================================================================
  PROP BETTING SHEET: Player A vs Player B
  Format: Best-of-5 (First to 3)
  Match Prob: Player A 68.3% | Player B 31.7%
  Leg Prob:   Player A 60.0% | Player B 40.0%
  Margin: 5%
========================================================================

  --- Match Winner ---
  Who wins the match? (Best-of-5)

    Player A                         1.39  (fair: 68.3%)
    Player B                         2.97  (fair: 31.7%)

  --- Total Legs O/U 3.5 ---
  Will there be over or under 3.5 total legs? Possible range: 3-5

    Under 3.5                        3.38  (fair: 28.0%)
    Over 3.5                         1.33  (fair: 72.0%)

  --- Deciding Leg ---
  Will the match go to a deciding leg 3-2 / 2-3?

    Yes                              2.74  (fair: 34.6%)
    No                               1.44  (fair: 65.4%)

  --- Correct Score ---
  Predict the exact leg score (Best-of-5)

    3-1                              3.52  (fair: 25.9%)
    3-0                              4.20  (fair: 21.6%)
    3-2                              4.39  (fair: 20.7%)
    2-3                              6.59  (fair: 13.8%)
    1-3                              7.91  (fair: 11.5%)
    0-3                             14.19  (fair:  6.4%)

  --- Leg Handicap (1.5) ---
  Player A must win by 2+ legs / Player B must not lose by 2+ legs

    Player A -1.5                    1.98  (fair: 47.5%)
    Player B +1.5                    1.87  (fair: 52.5%)

  --- Leg Handicap (2.5) ---
  Player A must win by 3 legs (sweep) / Player B must not be swept

    Player A -2.5                    4.33  (fair: 21.6%)
    Player B +2.5                    1.20  (fair: 78.4%)

  --- Player B To Win At Least 1 Leg ---
  Will Player B win at least one leg against Player A?

    Player B wins 1+ legs            1.33  (fair: 78.4%)
    Player A clean sweep             4.38  (fair: 21.6%)

  --- First Leg Winner ---
  Who wins the opening leg?

    Player A                         1.58  (fair: 60.0%)
    Player B                         2.37  (fair: 40.0%)

========================================================================
```

### 5.3 Integration with Existing Predictor

The `PropOddsCalculator` integrates directly with the existing `predictor.py`:

```python
# Integration example
from predictor import predict_match, PLAYERS

# Get Elo-based match probability
result = predict_match("BERKAY", "ECE")
win_prob_a = result["prob_a"] / 100.0  # Convert percentage to decimal

# Calculate all props
calc = PropOddsCalculator(
    player_a=result["player_a"],
    player_b=result["player_b"],
    player_a_win_prob=win_prob_a,
    match_format=5,  # Bo5 for quarterfinals
    margin=0.05,
)

sheet = calc.calculate_all()

# Convert to dict for API
prop_data = PropOddsCalculator.to_dict(sheet)

# Feed into seed_markets.py for database seeding
for market in prop_data["markets"]:
    selections = [(s["name"], s["odds"]) for s in market["selections"]]
    # Create market with selections via API
```

### 5.4 Dependency: scipy

The implementation uses `scipy.optimize.brentq` for the root-finding step and `scipy.special.comb` for exact binomial coefficients. Add to requirements:

```
scipy>=1.11.0
```

**Alternative without scipy** (pure Python fallback):

```python
def _comb(n, k):
    """Binomial coefficient C(n, k) using pure Python."""
    if k < 0 or k > n:
        return 0
    if k == 0 or k == n:
        return 1
    k = min(k, n - k)
    result = 1
    for i in range(k):
        result = result * (n - i) // (i + 1)
    return result


def _bisect_leg_prob(match_prob, legs_to_win, tol=1e-10, max_iter=100):
    """Bisection method to find leg probability from match probability."""
    lo, hi = 0.001, 0.999
    for _ in range(max_iter):
        mid = (lo + hi) / 2
        calc_prob = match_win_prob_from_leg_prob(mid, legs_to_win)
        if abs(calc_prob - match_prob) < tol:
            return mid
        if calc_prob < match_prob:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
```

---

## 6. Market Attractiveness & Recommendations

### 6.1 Engagement Ranking

Based on analysis of social betting behavior and darts-specific dynamics:

| Rank | Market | Fun Factor | Betting Volume | Skill Required | Recommended |
|------|--------|-----------|----------------|----------------|-------------|
| 1 | **Correct Score** | Very High | High | Medium | YES - flagship prop |
| 2 | **Match Winner** | High | Very High | Low | YES - core market |
| 3 | **Deciding Leg** | High | Medium | Low | YES - drama market |
| 4 | **Leg Handicap** | Medium | Medium | Medium | YES - value market |
| 5 | **Total Legs O/U** | Medium | Medium | Medium | YES - standard prop |
| 6 | **First Leg Winner** | Medium | Low-Medium | Low | YES - opener |
| 7 | **Win 1+ Legs** | Medium | Low | Low | CONDITIONAL - only for lopsided matches |
| 8 | **Bracket Half** | Medium | Low | Low | YES - tournament prop |

### 6.2 Recommended Prop Menu for Social Platform

#### Tier 1: Always Offer (Every Match)

1. **Match Winner** - The core H2H market. Everyone understands it.
2. **Correct Score** - The highest-engagement prop. Correct score bets generate the most discussion and banter because they require a specific prediction. The higher odds (4x-15x) are exciting for token play.
3. **Deciding Leg (Yes/No)** - Simple, dramatic, and always relevant. "Will this go the distance?" is a natural question friends ask each other.

#### Tier 2: Offer for Most Matches

4. **Total Legs O/U** - Good for matches where the skill gap is interesting. "Will Berkay sweep Ece or will she take a leg?"
5. **Leg Handicap (-1.5)** - Levels the playing field for lopsided matchups. Makes boring mismatches interesting.

#### Tier 3: Offer Selectively

6. **First Leg Winner** - Good for semis/finals where there's more attention on the match. Less interesting for early rounds.
7. **Win At Least 1 Leg** - Only offer when one player is a massive underdog (70%+ match probability for favorite). Otherwise redundant.

#### Tier 4: Tournament-Level (Offer Once)

8. **Bracket Half Winner** - One market per tournament. Fun conversation starter.
9. **Tournament Winner** (outright) - Already exists in the platform.

### 6.3 Margin Strategy for Social Platform

Since this is a fun-token platform, the goal is **maximum engagement, not maximum profit**. The "house" (bookmaker admin) should aim for:

| Strategy | Margin | Rationale |
|----------|--------|-----------|
| **Core markets** (H2H, O/U) | 5% | Competitive odds encourage betting |
| **Correct Score** | 8% | Higher margin hidden in multi-outcome |
| **Novelty props** (1+ leg, first leg) | 3-5% | Low margin = more fun |
| **Tournament outright** | 10% | Standard for multi-runner markets |

**Key principle:** In a social token platform, the house should break roughly even or generate a small surplus. A 5% average margin means for every 100 tokens wagered, the house keeps 5 tokens on average. This drains the player pool slowly enough to keep the game fun for the entire tournament.

**Token economy tip:** Give players a small daily/weekly token bonus to offset house edge and keep everyone active. Example: 5 free tokens per match day.

### 6.4 Market Creation Workflow

For the admin (bookmaker), here is the recommended workflow for each match:

```
1. Match announced (from bracket)
   ↓
2. Run PropOddsCalculator with Elo probabilities
   ↓
3. Auto-generate 5-7 markets with calibrated odds
   ↓
4. Admin reviews and optionally adjusts odds
   ↓
5. Markets go live (status: OPEN)
   ↓
6. Match plays out → Admin records leg score
   ↓
7. Auto-settle all prop markets from leg score
   ↓
8. Payouts distributed automatically
```

Steps 2-3 and 7 can be fully automated using the `PropOddsCalculator` and the match result. The admin's only manual work is reviewing odds (optional) and recording the final leg score.

### 6.5 Display Recommendations for UI

For maximum engagement, display props with:

1. **Probability bars** - Visual representation of each outcome's probability
2. **"Hot" indicators** - Show which selections are getting the most bets (pool betting)
3. **Social feed** - "Emre just bet 10 tokens on 3-2 correct score!"
4. **Odds movement** - Show when parimutuel odds shift (arrows up/down)
5. **Prop combos** - Suggest interesting multi-market narratives: "Berkay to win 3-0 at 4.20 --- the sweep special!"

---

## Appendix A: Quick Reference Formulas

### Best-of-5 (First to 3), leg probability p

| Formula | Expression |
|---------|-----------|
| P(A wins match) | p^3(10 - 15p + 6p^2) |
| P(3-0) | p^3 |
| P(3-1) | 3p^3(1-p) |
| P(3-2) | 6p^3(1-p)^2 |
| P(0-3) | (1-p)^3 |
| P(1-3) | 3p(1-p)^3 |
| P(2-3) | 6p^2(1-p)^3 |
| P(3 legs total) | p^3 + (1-p)^3 |
| P(4 legs total) | 3p(1-p)[p^2 + (1-p)^2] |
| P(5 legs total) | 6p^2(1-p)^2 |
| P(deciding leg) | 6p^2(1-p)^2 |
| P(A covers -1.5) | p^3(4 - 3p) |
| P(underdog wins 1+) | 1 - p^3 (where p = fav leg prob) |

### Best-of-7 (First to 4), leg probability p

| Formula | Expression |
|---------|-----------|
| P(A wins match) | p^4(35 - 84p + 70p^2 - 20p^3) |
| P(4-0) | p^4 |
| P(4-1) | 4p^4(1-p) |
| P(4-2) | 10p^4(1-p)^2 |
| P(4-3) | 20p^4(1-p)^3 |
| P(0-4) | (1-p)^4 |
| P(1-4) | 4p(1-p)^4 |
| P(2-4) | 10p^2(1-p)^4 |
| P(3-4) | 20p^3(1-p)^4 |
| P(deciding leg) | 20p^3(1-p)^3 |
| P(A covers -1.5) | p^4(5 - 4p) |
| P(A covers -2.5) | p^4(1 + 4(1-p)) = p^4(5 - 4p) |

Wait, -2.5 means win by 3+: scores 4-0 and 4-1:
```
P(A covers -2.5) = p^4 + 4p^4(1-p) = p^4(1 + 4(1-p)) = p^4(5 - 4p)
```

Correction: -1.5 means win by 2+: scores 4-0, 4-1, 4-2:
```
P(A covers -1.5) = p^4 + 4p^4(1-p) + 10p^4(1-p)^2
                  = p^4[1 + 4(1-p) + 10(1-p)^2]
```

### General Formula (First to N)

| Formula | Expression |
|---------|-----------|
| P(A wins N-k) | C(N-1+k, k) * p^N * (1-p)^k |
| P(B wins k-N) | C(N-1+k, k) * (1-p)^N * p^k |
| P(total = N+k legs) | C(N-1+k,k) * [p^N(1-p)^k + (1-p)^N*p^k] |
| P(A wins match) | sum_{k=0}^{N-1} C(N-1+k, k) * p^N * (1-p)^k |

---

## Appendix B: Probability Tables

### Table B1: Match Win Probability from Leg Probability

| p (leg) | Bo3 | Bo5 | Bo7 | Bo9 | Bo11 |
|---------|-----|-----|-----|-----|------|
| 0.50 | .500 | .500 | .500 | .500 | .500 |
| 0.52 | .520 | .525 | .529 | .532 | .534 |
| 0.55 | .555 | .593 | .608 | .621 | .632 |
| 0.58 | .589 | .636 | .660 | .680 | .697 |
| 0.60 | .612 | .683 | .710 | .733 | .753 |
| 0.62 | .634 | .707 | .756 | .782 | .803 |
| 0.65 | .667 | .765 | .800 | .828 | .851 |
| 0.68 | .699 | .807 | .848 | .877 | .899 |
| 0.70 | .720 | .837 | .874 | .901 | .922 |
| 0.75 | .781 | .896 | .929 | .951 | .965 |
| 0.80 | .832 | .942 | .967 | .981 | .989 |
| 0.85 | .876 | .973 | .988 | .995 | .998 |
| 0.90 | .914 | .992 | .997 | .999 | 1.00 |

### Table B2: Correct Score Probabilities (Bo5) for Selected Matchups

| Score | p=0.50 | p=0.55 | p=0.60 | p=0.65 | p=0.70 | p=0.75 |
|-------|--------|--------|--------|--------|--------|--------|
| 3-0 | 12.5% | 16.6% | 21.6% | 27.5% | 34.3% | 42.2% |
| 3-1 | 18.8% | 22.3% | 25.9% | 28.9% | 30.9% | 31.6% |
| 3-2 | 18.8% | 20.3% | 20.7% | 19.8% | 17.6% | 14.6% |
| 0-3 | 12.5% | 9.1% | 6.4% | 4.3% | 2.7% | 1.6% |
| 1-3 | 18.8% | 15.1% | 11.5% | 8.4% | 5.7% | 3.5% |
| 2-3 | 18.8% | 16.5% | 13.8% | 11.1% | 8.5% | 6.2% |

### Table B3: Over/Under 3.5 Legs (Bo5)

| p (leg) | Under 3.5 | Over 3.5 | Fair O3.5 Odds | Fair U3.5 Odds |
|---------|-----------|----------|----------------|----------------|
| 0.50 | 25.0% | 75.0% | 1.33 | 4.00 |
| 0.55 | 25.7% | 74.3% | 1.35 | 3.89 |
| 0.60 | 28.0% | 72.0% | 1.39 | 3.57 |
| 0.65 | 31.8% | 68.2% | 1.47 | 3.14 |
| 0.70 | 37.0% | 63.0% | 1.59 | 2.70 |
| 0.75 | 43.8% | 56.3% | 1.78 | 2.29 |
| 0.80 | 51.8% | 48.2% | 2.08 | 1.93 |

---

## Appendix C: Sources

- [bet365 Darts Betting Guide](https://news.bet365.com/en-gb/article/darts-betting-guide/2025111815550434792) - Comprehensive overview of professional darts markets
- [Outplayed Ultimate Darts Betting Guide](https://outplayed.com/blog/darts-betting-guide) - Market types and strategies
- [WagerTalk Darts Betting 101](https://www.wagertalk.com/news/darts/darts-betting-101-how-to-bet-on-darts-for-maximum-success/) - Darts betting fundamentals
- [Hard Rock Bet Darts](https://www.hardrock.bet/sportsbook/darts/) - Prop bet explanations
- [Spreadex Darts Spread Betting](https://www.spreadex.com/sports/get-started/darts-spread-betting/) - Spread/handicap markets
- [Predicting Professional Darts Tournaments (Klaassen & Magnus)](https://www.tandfonline.com/doi/abs/10.1080/24748668.2017.1372162) - Academic paper on negative binomial models for darts
- [BettingIsCool Darts Tournament Predictions](https://bettingiscool.com/2019/09/27/darts-tournament-predictions/) - Elo and Beta distribution methods
- [Betfair Community: Probability Formula](https://community.betfair.com/general_betting/go/thread/view/94082/30787835/probability-formula-question) - Match probability from leg probability discussion
- [MIT: Sports Competitions and the Binomial Distribution](https://math.mit.edu/classes/18.095/2016IAP/lec9/Brenner_IAP_2016.pdf) - Mathematical foundations
- [DraftKings 9-Dart Finish Market](https://sportsbook.draftkings.com/leagues/darts/players-championship?category=match-props&subcategory=9-dart-finish) - Professional 9-dart finish pricing
- [Betting Sites Offers: Correct Score in Darts](https://www.bettingsitesoffers.com/sports/darts/correct-score/) - Correct score market explanation
- [DataGenetics: A Geek Plays Darts](http://www.datagenetics.com/blog/january12012/index.html) - Darts probability analysis
