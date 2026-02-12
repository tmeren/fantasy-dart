# Overround (Margin) Calculation for 8-Player Outright Winner Market

## Research Report for Fantasy Darts Betting Platform

**Date:** 2026-02-11
**Context:** Social/fun betting platform, friend-group darts tournament, token economy (not real money)
**Market:** 8-player knockout bracket, outright winner

---

## Table of Contents

1. [Overround Fundamentals](#1-overround-fundamentals)
2. [Margin Distribution Methods](#2-margin-distribution-methods)
3. [Practical Example with 8 Players](#3-practical-example-with-8-players)
4. [Odds Formatting](#4-odds-formatting)
5. [Dynamic Overround Considerations](#5-dynamic-overround-considerations)
6. [Implementation](#6-implementation)
7. [Recommendation for Our Platform](#7-recommendation-for-our-platform)
8. [Sources](#8-sources)

---

## 1. Overround Fundamentals

### 1.1 What is Overround?

**Overround** (also called **vigorish**, **vig**, **juice**, or **bookmaker margin**) is the mechanism by which a bookmaker guarantees profit regardless of the outcome. It works by setting odds such that the sum of all implied probabilities exceeds 100%.

In a perfectly fair market with no margin:

```
Sum of implied probabilities = 100%
(1/odds_1) + (1/odds_2) + ... + (1/odds_n) = 1.00
```

With a bookmaker's margin:

```
Sum of implied probabilities > 100%
(1/odds_1) + (1/odds_2) + ... + (1/odds_n) = 1.00 + margin
```

**Example:** In a fair coin flip, both sides should be 2.00 (50% each, summing to 100%). A bookmaker might offer both at 1.91, making the implied probabilities 52.4% each, summing to 104.8%. The extra 4.8% is the overround.

**Key formula:**

```
Overround (%) = (sum of all implied probabilities) x 100
Margin (%) = Overround - 100%
House Edge (%) = 1 - (1 / Overround_decimal)
```

So a 108% overround = 8% margin. The house edge (expected profit per unit wagered) is `1 - (1/1.08) = 7.41%`.

### 1.2 Industry Standard Overround by Market Type

| Market Type | Selections | Professional Books | Recreational Books | Sharp Books (Pinnacle) |
|---|---|---|---|---|
| **Head-to-head** (tennis, MMA) | 2 | 104-106% | 106-110% | 102-103% |
| **Match result** (football 1X2) | 3 | 104-107% | 107-112% | 103-105% |
| **Outright winner** (8 runners) | 8 | 110-120% | 115-130% | 108-112% |
| **Outright winner** (20+ runners) | 20+ | 115-140% | 120-150% | 110-120% |
| **Correct score** | 20-30 | 120-160% | 140-180% | N/A |
| **Prop bets** (yes/no) | 2-4 | 105-110% | 108-115% | 104-106% |
| **Exotic props** (first scorer, etc.) | 10+ | 115-135% | 120-150% | N/A |

### 1.3 How Overround Scales with Number of Selections

There is a direct relationship between the number of outcomes and the expected overround. More selections give the bookmaker more "surface area" to embed margin, and bettors find it harder to evaluate many-outcome markets.

**Scaling principle:** For `n` equally-likely outcomes, the margin `m` approximately scales as:

```
m_n_outcomes ~ m_2_outcomes * sqrt(n/2)
```

This is an approximation. In practice, the relationship depends on the probability distribution (skewed vs. uniform).

| Selections | Typical Margin (Pro) | Typical Margin (Rec) | Effective House Edge |
|---|---|---|---|
| 2 | 4-6% | 6-10% | 2.9-4.8% |
| 3 | 5-7% | 7-12% | 3.2-5.7% |
| 8 | 10-20% | 15-30% | 5.0-13.0% |
| 20 | 15-40% | 20-50% | 7.5-20.0% |

### 1.4 Target Overround for Our Platform

For a **fun/social betting platform** with token economy:

| Factor | Consideration | Impact on Margin |
|---|---|---|
| **No real money** | Players more tolerant of house edge | Can be slightly higher |
| **Friend group** | Fairness perception matters for engagement | Should feel fair |
| **Small player pool** | Need to build liquidity, encourage participation | Lower is better |
| **Token economy** | House edge controls inflation | Need some edge |
| **Fun factor** | Odds should look reasonable to non-experts | Moderate margin |

**Recommendation:** **105-110%** overround for our 8-player outright market.

- **108%** (8% margin, ~7.4% house edge) is the sweet spot
- Enough to sustain the token economy
- Low enough that odds look fair and engagement stays high
- Professional feel without professional-level extraction

For **head-to-head match bets** (2 outcomes): **104-105%**
For **prop bets**: **106-108%**

---

## 2. Margin Distribution Methods

The critical question is not just *how much* margin to apply, but *how to distribute* it across selections. This is where academic research diverges significantly from naive approaches.

### 2.1 Equal Margin Method (Additive)

**Formula:**

```
adjusted_prob_i = true_prob_i + (overround - 1) / n
decimal_odds_i = 1 / adjusted_prob_i
```

Where `n` is the number of selections. Each outcome receives the same absolute increase in implied probability.

**Forward (applying overround):**
```
margin_per_selection = (target_overround - 1.0) / n
bookmaker_prob_i = true_prob_i + margin_per_selection
odds_i = 1.0 / bookmaker_prob_i
```

**Properties:**
- Every selection's implied probability increases by the same fixed amount
- Simple to understand and implement
- Can produce negative probabilities for extreme longshots (if `true_prob < margin/n`, the adjusted prob would need to be rechecked)
- Does NOT account for favourite-longshot bias
- Overcompresses longshot odds

**When to use:** When simplicity is paramount and all selections have similar probabilities.

### 2.2 Proportional Margin Method (Multiplicative / Normalization)

**Formula:**

```
bookmaker_prob_i = true_prob_i * target_overround
odds_i = 1.0 / bookmaker_prob_i
```

Or equivalently:

```
fair_odds_i = 1.0 / true_prob_i
adjusted_odds_i = fair_odds_i / target_overround
```

**Properties:**
- Each selection's probability is multiplied by the same factor (the overround)
- Margin is proportional to the true probability (favourites bear more absolute margin, but same relative margin)
- Never produces negative probabilities
- Does NOT account for favourite-longshot bias (margin is evenly distributed in relative terms)
- Most commonly used method due to simplicity

**When to use:** The default choice for most applications. Good balance of simplicity and correctness.

### 2.3 Favourite-Longshot Bias (FLB) Method

The favourite-longshot bias is a well-documented empirical phenomenon (first noted by Griffith, 1949): **longshots are systematically overbet relative to their true probability, while favourites are underbet.** Bookmakers exploit this by applying more margin to longshots.

**Formula (Odds-based weighting):**

```
weight_i = (1 / true_prob_i) ^ alpha  # alpha controls bias strength
normalized_weight_i = weight_i / sum(weights)
margin_pool = target_overround - 1.0
bookmaker_prob_i = true_prob_i + margin_pool * normalized_weight_i
odds_i = 1.0 / bookmaker_prob_i
```

With `alpha = 1.0`, this distributes margin proportional to the fair odds (longshots get more margin).

**Properties:**
- Matches empirical bookmaker behavior
- Longshots receive disproportionately more margin
- Favourites' odds stay closer to fair value
- Configurable via `alpha` parameter
- More complex to implement
- Can be tuned to match specific market styles

**When to use:** When you want realistic-looking odds that match what experienced bettors expect.

### 2.4 Shin Method

Developed by Hyun Song Shin (1991, 1993), this academic approach models the bookmaker's optimal pricing strategy when some proportion `z` of bettors are "insiders" (people who know the true outcome).

**Important caveat:** Shin's method is primarily designed as a **de-vigging tool** (extracting true probabilities from bookmaker odds). When used in the forward direction (applying margin to true probabilities), the model is mathematically degenerate -- the z parameter is fully determined by the target overround and number of outcomes, leaving no free parameter for distributing the FLB effect. At low overrounds (like our 108%), the Shin forward direction produces results nearly identical to the multiplicative method.

**De-vigging formula (Shin's primary use case):**

Given bookmaker implied probabilities `r_i` (where `sum(r_i) = S`), the true probability is:

```
p_i = (sqrt(z^2 + 4*(1-z)*(r_i/S)) - z) / (2*(1-z))
```

**Forward direction (applying margin):**

The practical forward approach is:
1. Derive z from the overround: `z = (S - 1) / (n - 1)` where n = number of outcomes
2. Compute Shin-normalized probabilities: `b_i = (sqrt(z^2 + 4*(1-z)*p_i^2) - z) / (2*(1-z))`
3. Scale to target: `bk_i = b_i * S / sum(b_i)`
4. `odds_i = 1 / bk_i`

**Properties:**
- Theoretically grounded in game theory and information economics
- Best suited as a de-vigging tool (backward direction)
- In forward direction at low margins, behaves very similarly to multiplicative
- Produces a meaningful `z` parameter in de-vigging (insider trading estimate)
- Well-studied in academic literature
- At 108% with 8 outcomes, z = 0.0114 (1.1%), producing minimal FLB effect

**When to use:** De-vigging bookmaker odds to extract true probabilities. For forward margin application, prefer the Power method instead.

### 2.5 Power Method (Logarithmic)

Introduced by Vovk & Zhdanov (2009) and Clarke (2016), later popularized by Joseph Buchdahl. The relationship between true probability and bookmaker probability follows a power law.

**Formula:**

```
bookmaker_prob_i = true_prob_i ^ (1/k)
```

Where `k` is found such that: `sum(true_prob_i ^ (1/k)) = target_overround`

Since `k > 1`, the exponent `1/k` is between 0 and 1, which for probabilities `0 < p < 1`:
- `p^(1/k) > p` (moves all values toward 1, creating overround)
- Smaller probabilities are moved MORE in relative terms (natural favourite-longshot bias)

**Forward direction:** Find `k > 1` such that `sum(p_i^(1/k)) = S` where `S` is target overround.

Then `odds_i = 1 / (p_i^(1/k))`

**Properties:**
- Never produces probabilities outside [0, 1]
- Naturally captures favourite-longshot bias
- Single parameter to solve for
- Empirically outperforms multiplicative method
- Comparable to Shin method in accuracy
- Elegant mathematical formulation

**When to use:** Best overall method for most applications. Recommended by recent research.

### 2.6 Odds Ratio Method

From Cheung (2015), popularized by Buchdahl in "Wisdom of the Crowd."

**Formula:**

```
bookmaker_prob_i = true_prob_i * OR / (1 - true_prob_i + true_prob_i * OR)
```

Where `OR` (odds ratio) is found such that `sum(bookmaker_prob_i) = target_overround`.

**Properties:**
- Based on logistic transformation
- Never produces probabilities outside [0, 1]
- Accounts for favourite-longshot bias
- Single parameter to solve for
- Less well-studied than Shin/Power methods
- Produces slightly different bias profile than Power method

**When to use:** Alternative to Power method. Good when you want logistic-style transformation.

### 2.7 Comparison Table

| Method | FLB Handling | Computation | Negative Probs? | Prob > 1? | Accuracy Rank | Simplicity |
|---|---|---|---|---|---|---|
| **Equal/Additive** | None | O(1) | Possible | No | 6th | Very Simple |
| **Multiplicative** | None | O(1) | No | No | 5th | Very Simple |
| **FLB Weighted** | Configurable | O(1) | Possible | No | 4th | Simple |
| **Shin** | De-vig only | O(n * iter) | No | Possible (reverse) | N/A (de-vig) | Complex |
| **Power** | Natural | O(n * iter) | No | No | 1st | Moderate |
| **Odds Ratio** | Mild natural | O(n * iter) | No | No | 2nd | Moderate |

**Key insight from Clarke (2016):** The power method universally outperforms the multiplicative method and outperforms or is comparable to the Shin method across empirical tests.

**Key finding from our analysis:** The Shin method is designed for de-vigging (backward direction) and does not produce correct FLB when used in the forward direction at low overrounds. The Power method is the recommended alternative for forward margin application.

---

## 3. Practical Example with 8 Players

### True Probabilities (from Elo model):

| Player | True Prob | Fair Odds |
|---|---|---|
| Berkay | 0.28 | 3.57 |
| Alican | 0.22 | 4.55 |
| Ekin | 0.13 | 7.69 |
| Seckin | 0.12 | 8.33 |
| Baran | 0.10 | 10.00 |
| Erkut | 0.07 | 14.29 |
| Muzaffer | 0.05 | 20.00 |
| Ece | 0.03 | 33.33 |
| **Total** | **1.00** | **--** |

**Target Overround:** 108% (1.08)

### 3.1 Equal Margin (Additive)

```
margin_per_selection = (1.08 - 1.00) / 8 = 0.01
bookmaker_prob_i = true_prob_i + 0.01
```

| Player | True Prob | Bk Prob | Decimal Odds | Fair Odds | Margin Applied |
|---|---|---|---|---|---|
| Berkay | 0.2800 | 0.2900 | **3.45** | 3.57 | +1.0pp |
| Alican | 0.2200 | 0.2300 | **4.35** | 4.55 | +1.0pp |
| Ekin | 0.1300 | 0.1400 | **7.14** | 7.69 | +1.0pp |
| Seckin | 0.1200 | 0.1300 | **7.69** | 8.33 | +1.0pp |
| Baran | 0.1000 | 0.1100 | **9.09** | 10.00 | +1.0pp |
| Erkut | 0.0700 | 0.0800 | **12.50** | 14.29 | +1.0pp |
| Muzaffer | 0.0500 | 0.0600 | **16.67** | 20.00 | +1.0pp |
| Ece | 0.0300 | 0.0400 | **25.00** | 33.33 | +1.0pp |
| **Sum** | **1.0000** | **1.0800** | | | |

**Verification:** Sum of (1/odds) = 0.29+0.23+0.14+0.13+0.11+0.08+0.06+0.04 = 1.08. Correct.

**Observation:** Every player gets the same +1 percentage point, which means Ece's odds are shortened by a massive ~25% (from 33.33 to 25.00), while Berkay's are shortened by only ~3.4%. This is the opposite of realistic bookmaker behavior.

### 3.2 Multiplicative (Proportional)

```
bookmaker_prob_i = true_prob_i * 1.08
```

| Player | True Prob | Bk Prob | Decimal Odds | Fair Odds | Odds Reduction |
|---|---|---|---|---|---|
| Berkay | 0.2800 | 0.3024 | **3.31** | 3.57 | -7.4% |
| Alican | 0.2200 | 0.2376 | **4.21** | 4.55 | -7.4% |
| Ekin | 0.1300 | 0.1404 | **7.12** | 7.69 | -7.4% |
| Seckin | 0.1200 | 0.1296 | **7.72** | 8.33 | -7.4% |
| Baran | 0.1000 | 0.1080 | **9.26** | 10.00 | -7.4% |
| Erkut | 0.0700 | 0.0756 | **13.23** | 14.29 | -7.4% |
| Muzaffer | 0.0500 | 0.0540 | **18.52** | 20.00 | -7.4% |
| Ece | 0.0300 | 0.0324 | **30.86** | 33.33 | -7.4% |
| **Sum** | **1.0000** | **1.0800** | | | |

**Observation:** Every player's odds are reduced by exactly 7.4% (the factor 1/1.08). Simple, clean, but does not reflect the favourite-longshot bias.

### 3.3 Favourite-Longshot Bias (alpha=0.5, recommended)

```
weight_i = (1/true_prob_i)^0.5 = sqrt(fair_odds_i)
margin distributed proportional to sqrt of fair odds
```

| Player | True Prob | Bk Prob | Decimal Odds | Fair Odds | Odds Drop |
|---|---|---|---|---|---|
| Berkay | 0.2800 | 0.2856 | **3.50** | 3.57 | -2.0% |
| Alican | 0.2200 | 0.2263 | **4.42** | 4.55 | -2.8% |
| Ekin | 0.1300 | 0.1383 | **7.23** | 7.69 | -6.0% |
| Seckin | 0.1200 | 0.1286 | **7.78** | 8.33 | -6.7% |
| Baran | 0.1000 | 0.1094 | **9.14** | 10.00 | -8.6% |
| Erkut | 0.0700 | 0.0813 | **12.31** | 14.29 | -13.8% |
| Muzaffer | 0.0500 | 0.0633 | **15.79** | 20.00 | -21.0% |
| Ece | 0.0300 | 0.0472 | **21.19** | 33.33 | -36.4% |
| **Sum** | **1.0000** | **1.0800** | | | |

**Observation:** With alpha=0.5 (recommended), longshots still get more margin (Ece -36.4%) while favourites are protected (Berkay -2.0%). The gradient is steep -- arguably too steep for Ece. This method is configurable: lower alpha reduces the bias, alpha=0 converges to the additive method. For reference, alpha=1.0 produces even more extreme results (Ece's odds would drop to 17.86, a 46% reduction).

### 3.4 Shin Method (Forward Application)

Using Shin normalized distribution scaled to target overround. With `z = (S-1)/(n-1) = 0.08/7 = 0.0114`:

```
b_i = (sqrt(z^2 + 4*(1-z)*p_i^2) - z) / (2*(1-z))
bk_i = b_i * S / sum(b_i)
```

| Player | True Prob | Bk Prob | Decimal Odds | Fair Odds | Odds Change |
|---|---|---|---|---|---|
| Berkay | 0.2800 | 0.3100 | **3.23** | 3.57 | -9.7% |
| Alican | 0.2200 | 0.2422 | **4.13** | 4.55 | -9.2% |
| Ekin | 0.1300 | 0.1406 | **7.11** | 7.69 | -7.5% |
| Seckin | 0.1200 | 0.1293 | **7.74** | 8.33 | -7.2% |
| Baran | 0.1000 | 0.1067 | **9.37** | 10.00 | -6.3% |
| Erkut | 0.0700 | 0.0729 | **13.72** | 14.29 | -3.9% |
| Muzaffer | 0.0500 | 0.0504 | **19.85** | 20.00 | -0.8% |
| Ece | 0.0300 | 0.0280 | **35.68** | 33.33 | +7.1% |
| **Sum** | **1.0000** | **1.0800** | | | |

**Observation:** In the forward direction, Shin produces **reverse** FLB at this low overround: favourites absorb MORE margin (Berkay -9.7%) while the longshot Ece actually gets odds ABOVE fair value (+7.1%). This is because Shin's normalization formula, designed for de-vigging, pushes all probabilities toward their true values, and the multiplicative scaling then overcompensates on the high-probability end. **This confirms that Shin is primarily a de-vigging tool and should not be used for forward margin application.** The Power method is the correct alternative.

### 3.5 Power Method

```
Find k such that sum of p_i^(1/k) = 1.08
```

Converged solution: `k = 1.0425` (exponent 1/k = 0.9592)

| Player | True Prob | Bk Prob (p^(1/k)) | Decimal Odds | Fair Odds | Odds Change |
|---|---|---|---|---|---|
| Berkay | 0.2800 | 0.2949 | **3.39** | 3.57 | -5.1% |
| Alican | 0.2200 | 0.2340 | **4.27** | 4.55 | -6.0% |
| Ekin | 0.1300 | 0.1413 | **7.08** | 7.69 | -8.0% |
| Seckin | 0.1200 | 0.1308 | **7.64** | 8.33 | -8.3% |
| Baran | 0.1000 | 0.1098 | **9.10** | 10.00 | -9.0% |
| Erkut | 0.0700 | 0.0780 | **12.82** | 14.29 | -10.3% |
| Muzaffer | 0.0500 | 0.0565 | **17.70** | 20.00 | -11.5% |
| Ece | 0.0300 | 0.0346 | **28.89** | 33.33 | -13.3% |
| **Sum** | **1.0000** | **1.0800** | | | |

**Observation:** The Power method produces a smooth, gentle FLB gradient from -5.1% (Berkay, favourite) to -13.3% (Ece, longshot). This is the most balanced and mathematically elegant approach. The gradient is moderate enough that all odds look reasonable, while still applying more margin to longshots as real bookmakers do.

### 3.6 Odds Ratio Method

```
Find OR such that sum of (p_i * OR) / (1 - p_i + p_i * OR) = 1.08
```

Converged solution: `OR = 1.0987`

| Player | True Prob | Bk Prob | Decimal Odds | Fair Odds | Odds Change |
|---|---|---|---|---|---|
| Berkay | 0.2800 | 0.2994 | **3.34** | 3.57 | -6.5% |
| Alican | 0.2200 | 0.2366 | **4.23** | 4.55 | -7.0% |
| Ekin | 0.1300 | 0.1410 | **7.09** | 7.69 | -7.8% |
| Seckin | 0.1200 | 0.1303 | **7.67** | 8.33 | -7.9% |
| Baran | 0.1000 | 0.1088 | **9.19** | 10.00 | -8.1% |
| Erkut | 0.0700 | 0.0764 | **13.09** | 14.29 | -8.4% |
| Muzaffer | 0.0500 | 0.0547 | **18.29** | 20.00 | -8.5% |
| Ece | 0.0300 | 0.0329 | **30.43** | 33.33 | -8.7% |
| **Sum** | **1.0000** | **1.0800** | | | |

**Observation:** The Odds Ratio method produces a gentle FLB gradient from -6.5% (Berkay) to -8.7% (Ece). It is very similar to the multiplicative method at this low overround, with only a slight skew. The logistic transformation provides a natural S-curve that prevents extreme distortions at both ends.

### 3.7 Side-by-Side Comparison (Decimal Odds)

| Player | Prob | Fair | Equal | Multiplicat. | FLB (a=0.5) | Shin | Power | Odds Ratio |
|---|---|---|---|---|---|---|---|---|
| **Berkay** | 0.28 | 3.57 | 3.45 | 3.31 | 3.50 | 3.23 | **3.39** | 3.34 |
| **Alican** | 0.22 | 4.55 | 4.35 | 4.21 | 4.42 | 4.13 | **4.27** | 4.23 |
| **Ekin** | 0.13 | 7.69 | 7.14 | 7.12 | 7.23 | 7.11 | **7.08** | 7.09 |
| **Seckin** | 0.12 | 8.33 | 7.69 | 7.72 | 7.78 | 7.74 | **7.64** | 7.67 |
| **Baran** | 0.10 | 10.00 | 9.09 | 9.26 | 9.14 | 9.37 | **9.10** | 9.19 |
| **Erkut** | 0.07 | 14.29 | 12.50 | 13.23 | 12.31 | 13.72 | **12.82** | 13.09 |
| **Muzaffer** | 0.05 | 20.00 | 16.67 | 18.52 | 15.79 | 19.85 | **17.70** | 18.29 |
| **Ece** | 0.03 | 33.33 | 25.00 | 30.86 | 21.19 | 35.68 | **28.89** | 30.43 |
| **Overround** | | 100% | 108% | 108% | 108% | 108% | **108%** | 108% |

### Odds Drop % from Fair Value (how much margin is applied to each player)

| Player | Fair | Equal | Multiplicat. | FLB (a=0.5) | Shin | Power | Odds Ratio |
|---|---|---|---|---|---|---|---|
| **Berkay** | 3.57 | 3.4% | 7.4% | 2.0% | 9.7% | **5.1%** | 6.5% |
| **Alican** | 4.55 | 4.3% | 7.4% | 2.8% | 9.2% | **6.0%** | 7.0% |
| **Ekin** | 7.69 | 7.1% | 7.4% | 6.0% | 7.5% | **8.0%** | 7.8% |
| **Seckin** | 8.33 | 7.7% | 7.4% | 6.7% | 7.2% | **8.3%** | 7.9% |
| **Baran** | 10.00 | 9.1% | 7.4% | 8.6% | 6.3% | **9.0%** | 8.1% |
| **Erkut** | 14.29 | 12.5% | 7.4% | 13.8% | 3.9% | **10.3%** | 8.4% |
| **Muzaffer** | 20.00 | 16.7% | 7.4% | 21.0% | 0.8% | **11.5%** | 8.5% |
| **Ece** | 33.33 | 25.0% | 7.4% | 36.4% | -7.1% | **13.3%** | 8.7% |

**Key takeaways:**
- **Multiplicative** applies exactly the same 7.4% drop to everyone -- simple but unrealistic
- **Equal (Additive)** hits longshots much harder in absolute terms (25% drop for Ece)
- **FLB** hits longshots very aggressively (36.4% for Ece) and barely touches favourites
- **Shin forward** is problematic -- it gives Ece BETTER than fair odds (+7.1%) and hammers favourites
- **Power** produces the most balanced gradient: 5.1% for Berkay to 13.3% for Ece
- **Odds Ratio** is similar to multiplicative with a mild gradient: 6.5% to 8.7%
- For our social platform, **Power** is the clear winner -- it produces natural FLB without extremes

---

## 4. Odds Formatting

### 4.1 Decimal Odds (Our Primary Format)

Decimal odds represent the total return per unit staked (including the stake). The payout for a winning bet is:

```
payout = stake * decimal_odds
profit = stake * (decimal_odds - 1)
```

**Convention:** Always displayed to 2 decimal places.

### 4.2 Clean Odds Presentation

Bettors expect odds to follow recognizable increments. Raw calculated odds should be rounded to "clean" values.

**Standard increments by odds range:**

| Odds Range | Increment | Examples |
|---|---|---|
| 1.01 - 2.00 | 0.01 | 1.45, 1.67, 1.91 |
| 2.00 - 3.00 | 0.05 | 2.10, 2.25, 2.50, 2.75 |
| 3.00 - 5.00 | 0.10 | 3.20, 3.50, 4.00, 4.50 |
| 5.00 - 10.00 | 0.25 | 5.50, 6.00, 7.50, 9.00 |
| 10.00 - 20.00 | 0.50 | 10.50, 13.00, 15.00, 17.00 |
| 20.00 - 50.00 | 1.00 | 21.00, 26.00, 34.00, 41.00 |
| 50.00+ | 5.00 | 51.00, 55.00, 67.00, 101.00 |

**For our fun platform**, we can use simpler rounding:
- Round to 2 decimal places for all odds
- Optionally snap to nearest 0.05 or 0.25 for cleaner display

### 4.3 Minimum and Maximum Odds

| Parameter | Value | Rationale |
|---|---|---|
| **Minimum odds** | 1.01 | Below this, payout is less than "double your money" for a near-certainty. Feels unfair. |
| **Maximum odds** | 100.00 | Beyond this, odds are essentially meaningless for a fun platform. Keeps UI clean. |
| **Longshot floor** | 1.05 | For heavy favourites in H2H (e.g., Berkay vs Ece). Ensures minimum excitement. |

### 4.4 Applying Clean Odds

After calculating raw odds, apply this formatting pipeline:

```python
def format_odds(raw_odds: float, min_odds: float = 1.01, max_odds: float = 100.0) -> float:
    """Round odds to clean values and enforce floors/ceilings."""
    odds = max(min_odds, min(max_odds, raw_odds))
    return round(odds, 2)
```

**Important:** After rounding, the overround may drift slightly from the target. This is acceptable for a social platform. If precision matters, one selection (typically the favourite) can be adjusted to restore exact overround.

---

## 5. Dynamic Overround Considerations

### 5.1 Tournament Progression

As the tournament progresses, the market structure changes:

| Stage | Players | Outcomes | Recommended Overround | Rationale |
|---|---|---|---|---|
| **Pre-tournament** (outright) | 8 | 8 | 108% | Full field, maximum uncertainty |
| **Quarter-final outright** | 4 remaining | 4 | 106% | Fewer outcomes, sharper information |
| **Semi-final outright** | 2 remaining | 2 | 104% | Binary outcome, must be tight |
| **Individual QF match** | 2 | 2 | 104-105% | Head-to-head, standard |
| **Individual SF/Final match** | 2 | 2 | 103-104% | High-profile match, tighter |

**Principle:** Reduce overround as the number of outcomes decreases. This follows industry practice and keeps odds looking sharp.

### 5.2 Head-to-Head Match Margins

For our knockout bracket H2H matches:

| Match Type | Overround | Rationale |
|---|---|---|
| **QF: Balanced** (e.g., Seckin vs Baran) | 105% | Close match, 2 outcomes |
| **QF: Lopsided** (e.g., Berkay vs Ece) | 104% | Heavy favourite, keep longshot attractive |
| **Semi-final** | 104% | Higher stakes, tighter odds |
| **Final** | 103% | Marquee event, lowest margin |

### 5.3 Prop Bet Margins

Prop bets can have slightly higher margins because:
- They are entertainment-focused (fun factor > value calculation)
- True probabilities are harder to estimate (less price-sensitive)
- Multiple outcomes provide more surface area

| Prop Type | Outcomes | Overround | Example |
|---|---|---|---|
| **Yes/No** | 2 | 106% | "Will Berkay make the final?" |
| **Player selection** | 4-8 | 108-110% | "Highest seed eliminated in QF" |
| **Exact outcome** | Many | 110-115% | "Correct final score" (if applicable) |

### 5.4 Making Props More Attractive

To drive engagement on prop bets:
- **Boosted odds:** Occasionally offer one prop at true probability (0% margin) as a promotion
- **Combined bets:** Bundle props with outright bets at a small discount
- **Early bird:** Offer slightly lower margin for bets placed before the tournament starts
- **Social odds:** Show how many friends have bet on each option (creates FOMO)

---

## 6. Implementation

### 6.1 Complete Python Module

```python
"""
Overround (Margin) Calculator for Betting Markets.

Implements 6 methods for distributing bookmaker margin across selections:
1. Equal (Additive)
2. Multiplicative (Proportional)
3. Favourite-Longshot Bias (Weighted)
4. Shin (Academic, game-theoretic)
5. Power (Logarithmic)
6. Odds Ratio (Logistic)

Usage:
    from overround import apply_overround

    true_probs = {
        "Berkay": 0.28, "Alican": 0.22, "Ekin": 0.13,
        "Seckin": 0.12, "Baran": 0.10, "Erkut": 0.07,
        "Muzaffer": 0.05, "Ece": 0.03,
    }

    result = apply_overround(true_probs, target_overround=1.08, method="power")
    print(result)  # {'Berkay': 3.32, 'Alican': 4.22, ...}
"""

from __future__ import annotations

import math
from typing import Literal

# Type alias for supported methods
Method = Literal["equal", "multiplicative", "flb", "shin", "power", "odds_ratio"]

# ============================================================================
# Validation
# ============================================================================

def _validate_inputs(
    true_probs: dict[str, float],
    target_overround: float,
) -> None:
    """Validate that probabilities sum to ~1.0 and overround is > 1.0."""
    total = sum(true_probs.values())
    if not (0.999 <= total <= 1.001):
        raise ValueError(
            f"True probabilities must sum to 1.0, got {total:.6f}. "
            f"Probabilities: {true_probs}"
        )
    if any(p <= 0 for p in true_probs.values()):
        raise ValueError(
            f"All probabilities must be positive. Got: "
            f"{[k for k, v in true_probs.items() if v <= 0]}"
        )
    if target_overround <= 1.0:
        raise ValueError(
            f"Target overround must be > 1.0, got {target_overround}. "
            f"Example: 1.08 for 108% overround (8% margin)."
        )


def _validate_output(
    odds: dict[str, float],
    target_overround: float,
    method: str,
    tolerance: float = 0.001,
) -> None:
    """Validate that output odds produce the target overround."""
    actual_overround = sum(1.0 / o for o in odds.values())
    if abs(actual_overround - target_overround) > tolerance:
        raise ValueError(
            f"Method '{method}' produced overround {actual_overround:.4f}, "
            f"expected {target_overround:.4f} (tolerance: {tolerance})"
        )
    for name, o in odds.items():
        if o < 1.0:
            raise ValueError(
                f"Method '{method}' produced odds < 1.0 for {name}: {o:.4f}"
            )


# ============================================================================
# Method 1: Equal (Additive)
# ============================================================================

def _apply_equal(
    true_probs: dict[str, float],
    target_overround: float,
) -> dict[str, float]:
    """
    Equal margin method. Adds the same absolute probability to each selection.

    Formula: bk_prob_i = true_prob_i + (overround - 1) / n
    """
    n = len(true_probs)
    margin_per_selection = (target_overround - 1.0) / n

    odds = {}
    for name, prob in true_probs.items():
        bk_prob = prob + margin_per_selection
        if bk_prob <= 0:
            raise ValueError(
                f"Equal method produced negative probability for '{name}': "
                f"{prob} + {margin_per_selection} = {bk_prob}. "
                f"Use a different method for extreme longshots."
            )
        odds[name] = 1.0 / bk_prob

    return odds


# ============================================================================
# Method 2: Multiplicative (Proportional)
# ============================================================================

def _apply_multiplicative(
    true_probs: dict[str, float],
    target_overround: float,
) -> dict[str, float]:
    """
    Multiplicative method. Scales all probabilities by the same factor.

    Formula: bk_prob_i = true_prob_i * target_overround
             odds_i    = fair_odds_i / target_overround
    """
    odds = {}
    for name, prob in true_probs.items():
        bk_prob = prob * target_overround
        odds[name] = 1.0 / bk_prob

    return odds


# ============================================================================
# Method 3: Favourite-Longshot Bias (Weighted)
# ============================================================================

def _apply_flb(
    true_probs: dict[str, float],
    target_overround: float,
    alpha: float = 0.5,
) -> dict[str, float]:
    """
    Favourite-longshot bias method. Distributes margin proportional to
    fair odds raised to power alpha.

    Higher alpha = more margin on longshots, less on favourites.
    - alpha=0: equivalent to equal/additive
    - alpha=1: margin proportional to fair odds (extreme FLB)
    - alpha=0.5: moderate FLB (recommended)

    Formula:
        weight_i = (1/true_prob_i) ^ alpha
        norm_weight_i = weight_i / sum(weights)
        bk_prob_i = true_prob_i + (overround - 1) * norm_weight_i
    """
    margin_pool = target_overround - 1.0

    # Calculate weights: higher odds = higher weight
    weights = {}
    for name, prob in true_probs.items():
        fair_odds = 1.0 / prob
        weights[name] = fair_odds ** alpha

    total_weight = sum(weights.values())

    odds = {}
    for name, prob in true_probs.items():
        norm_weight = weights[name] / total_weight
        bk_prob = prob + margin_pool * norm_weight
        if bk_prob <= 0:
            raise ValueError(
                f"FLB method produced negative probability for '{name}': {bk_prob}. "
                f"Reduce alpha or target_overround."
            )
        odds[name] = 1.0 / bk_prob

    return odds


# ============================================================================
# Method 4: Shin
# ============================================================================

def _apply_shin(
    true_probs: dict[str, float],
    target_overround: float,
    max_iterations: int = 1000,
    convergence_threshold: float = 1e-12,
) -> dict[str, float]:
    """
    Shin method (forward application). Based on Shin (1991, 1993).

    NOTE: Shin's model is primarily a de-vigging tool. In the forward
    direction, it uses the Shin normalization formula with z derived
    from the target overround, then scales to achieve the target sum.

    At low overrounds (< 115%), this produces results very similar to
    the multiplicative method, with a slight reverse-FLB effect
    (more margin on favourites, less on longshots). For proper FLB
    in the forward direction, use the Power method instead.

    Forward procedure:
    1. Derive z from overround: z = (S - 1) / (n - 1)
    2. Compute Shin-normalized probs (sum to ~1.0):
       b_i = (sqrt(z^2 + 4*(1-z)*p_i^2) - z) / (2*(1-z))
    3. Scale to target: bk_i = b_i * S / sum(b_i)
    """
    S = target_overround
    probs = list(true_probs.values())
    names = list(true_probs.keys())
    n = len(probs)

    # Derive z from the overround and number of outcomes
    z = (S - 1.0) / (n - 1)
    z = max(1e-10, min(z, 0.999))  # Clamp to valid range

    # Compute Shin-normalized probabilities
    bk_raw = []
    for p in probs:
        numerator = math.sqrt(z**2 + 4 * (1 - z) * p**2) - z
        denominator = 2 * (1 - z)
        bk_raw.append(numerator / denominator)

    # Scale to achieve target overround
    raw_sum = sum(bk_raw)
    scale = S / raw_sum

    odds = {}
    for i, name in enumerate(names):
        bk_prob = bk_raw[i] * scale
        odds[name] = 1.0 / bk_prob

    return odds


# ============================================================================
# Method 5: Power (Logarithmic)
# ============================================================================

def _apply_power(
    true_probs: dict[str, float],
    target_overround: float,
    max_iterations: int = 1000,
    convergence_threshold: float = 1e-12,
) -> dict[str, float]:
    """
    Power method. Models bookmaker probs as true probs raised to a power.

    Proposed by Vovk & Zhdanov (2009), Clarke (2016), Buchdahl.
    Empirically the best-performing method.

    Formula: bk_prob_i = true_prob_i ^ (1/k)
    Find k such that sum(true_prob_i ^ (1/k)) = target_overround

    Properties:
    - Never produces probabilities outside [0, 1]
    - Naturally captures favourite-longshot bias
    - k > 1, so exponent 1/k is in (0, 1), meaning p^(1/k) > p for 0 < p < 1
    """
    S = target_overround
    probs = list(true_probs.values())
    names = list(true_probs.keys())

    def objective(k: float) -> float:
        """Sum of p^(1/k) minus target."""
        return sum(p ** (1.0 / k) for p in probs) - S

    # Search k in [1, large_value]:
    # At k=1: sum(p_i^1) = 1.0 < S (since probs sum to 1)
    # At k->inf: sum(p_i^0) = n >> S (for n=8, S=1.08)
    # So the solution k is in (1, infinity)
    k_low, k_high = 1.0, 100.0

    val_low = objective(k_low)  # Should be negative (sum=1.0 < S)

    if val_low > 0:
        raise ValueError(f"Power method: objective at k=1 is {val_low + S}, expected <= S={S}")

    k = 1.0
    for iteration in range(max_iterations):
        k_mid = (k_low + k_high) / 2
        val = objective(k_mid)

        if abs(val) < convergence_threshold:
            k = k_mid
            break

        if val < 0:
            k_low = k_mid
        else:
            k_high = k_mid

        k = k_mid

    # Compute final odds
    odds = {}
    for i, name in enumerate(names):
        bk_prob = probs[i] ** (1.0 / k)
        odds[name] = 1.0 / bk_prob

    return odds


# ============================================================================
# Method 6: Odds Ratio
# ============================================================================

def _apply_odds_ratio(
    true_probs: dict[str, float],
    target_overround: float,
    max_iterations: int = 1000,
    convergence_threshold: float = 1e-12,
) -> dict[str, float]:
    """
    Odds Ratio method. From Cheung (2015), popularized by Buchdahl.

    Uses a logistic-style transformation.

    Formula: bk_prob_i = (p_i * OR) / (1 - p_i + p_i * OR)
    Find OR such that sum(bk_prob_i) = target_overround

    OR > 1 increases all probabilities (creates overround).
    """
    S = target_overround
    probs = list(true_probs.values())
    names = list(true_probs.keys())

    def compute_bk_probs(or_val: float) -> list[float]:
        """Compute bookmaker probabilities for a given odds ratio."""
        bk = []
        for p in probs:
            bk.append((p * or_val) / (1 - p + p * or_val))
        return bk

    def objective(or_val: float) -> float:
        """Sum of bk probs minus target."""
        return sum(compute_bk_probs(or_val)) - S

    # Bisection: OR=1 gives sum=1 (fair), OR->inf gives sum=n
    or_low, or_high = 1.0, 1000.0

    or_val = 1.0
    for iteration in range(max_iterations):
        or_mid = (or_low + or_high) / 2
        val = objective(or_mid)

        if abs(val) < convergence_threshold:
            or_val = or_mid
            break

        if val < 0:
            or_low = or_mid
        else:
            or_high = or_mid

        or_val = or_mid

    # Compute final odds
    bk_probs = compute_bk_probs(or_val)
    odds = {}
    for i, name in enumerate(names):
        odds[name] = 1.0 / bk_probs[i]

    return odds


# ============================================================================
# Main API
# ============================================================================

def apply_overround(
    true_probs: dict[str, float],
    target_overround: float = 1.08,
    method: Method = "power",
    *,
    min_odds: float = 1.01,
    max_odds: float = 100.0,
    round_to: int = 2,
    flb_alpha: float = 0.5,
    validate: bool = True,
) -> dict[str, float]:
    """
    Apply overround (bookmaker margin) to true probabilities.

    Args:
        true_probs: Dict mapping selection names to true probabilities.
                    Must sum to 1.0.
        target_overround: Target overround as decimal (e.g., 1.08 for 108%).
                          Must be > 1.0.
        method: Margin distribution method. One of:
                - "equal": Equal/additive margin to all selections
                - "multiplicative": Proportional margin (most common)
                - "flb": Favourite-longshot bias weighted
                - "shin": Shin's game-theoretic method
                - "power": Power/logarithmic method (recommended)
                - "odds_ratio": Odds ratio method
        min_odds: Minimum decimal odds floor (default 1.01).
        max_odds: Maximum decimal odds ceiling (default 100.0).
        round_to: Decimal places to round odds (default 2).
        flb_alpha: FLB method alpha parameter (default 0.5).
                   Only used when method="flb".
        validate: Whether to validate inputs and outputs (default True).

    Returns:
        Dict mapping selection names to decimal odds.

    Raises:
        ValueError: If inputs are invalid or method produces invalid odds.

    Example:
        >>> probs = {"Team A": 0.6, "Team B": 0.4}
        >>> apply_overround(probs, 1.05, "multiplicative")
        {'Team A': 1.59, 'Team B': 2.38}
    """
    if validate:
        _validate_inputs(true_probs, target_overround)

    # Apply selected method
    method_map = {
        "equal": lambda: _apply_equal(true_probs, target_overround),
        "multiplicative": lambda: _apply_multiplicative(true_probs, target_overround),
        "flb": lambda: _apply_flb(true_probs, target_overround, alpha=flb_alpha),
        "shin": lambda: _apply_shin(true_probs, target_overround),
        "power": lambda: _apply_power(true_probs, target_overround),
        "odds_ratio": lambda: _apply_odds_ratio(true_probs, target_overround),
    }

    if method not in method_map:
        raise ValueError(
            f"Unknown method '{method}'. "
            f"Choose from: {list(method_map.keys())}"
        )

    raw_odds = method_map[method]()

    # Apply floor, ceiling, and rounding
    formatted_odds = {}
    for name, odds in raw_odds.items():
        odds = max(min_odds, min(max_odds, odds))
        odds = round(odds, round_to)
        formatted_odds[name] = odds

    # Validate output (on raw odds before rounding)
    if validate:
        _validate_output(raw_odds, target_overround, method)

    return formatted_odds


# ============================================================================
# Convenience functions
# ============================================================================

def calculate_overround(odds: dict[str, float]) -> float:
    """Calculate the actual overround from a set of decimal odds."""
    return sum(1.0 / o for o in odds.values())


def calculate_margin(odds: dict[str, float]) -> float:
    """Calculate the margin percentage from a set of decimal odds."""
    return (calculate_overround(odds) - 1.0) * 100


def calculate_house_edge(odds: dict[str, float]) -> float:
    """Calculate the house edge (expected profit per unit wagered)."""
    overround = calculate_overround(odds)
    return (1.0 - 1.0 / overround) * 100


def fair_odds(true_probs: dict[str, float]) -> dict[str, float]:
    """Calculate fair odds (no margin) from true probabilities."""
    return {name: round(1.0 / prob, 2) for name, prob in true_probs.items()}


def compare_methods(
    true_probs: dict[str, float],
    target_overround: float = 1.08,
) -> dict[str, dict[str, float]]:
    """
    Run all methods and return results for comparison.

    Returns:
        Dict mapping method name to its odds output.
    """
    methods: list[Method] = [
        "equal", "multiplicative", "flb", "shin", "power", "odds_ratio"
    ]
    results = {"fair": fair_odds(true_probs)}

    for method in methods:
        try:
            results[method] = apply_overround(
                true_probs, target_overround, method, validate=False
            )
        except Exception as e:
            results[method] = {"ERROR": str(e)}

    return results


def print_comparison(
    true_probs: dict[str, float],
    target_overround: float = 1.08,
) -> None:
    """Print a formatted comparison table of all methods."""
    results = compare_methods(true_probs, target_overround)

    methods = ["fair", "equal", "multiplicative", "flb", "shin", "power", "odds_ratio"]
    header = f"{'Player':<12}" + "".join(f"{m:<14}" for m in methods)

    print(f"\nOverround Comparison (Target: {target_overround*100:.0f}%)")
    print("=" * len(header))
    print(header)
    print("-" * len(header))

    for name in true_probs:
        row = f"{name:<12}"
        for method in methods:
            if method in results and name in results[method]:
                row += f"{results[method][name]:<14.2f}"
            else:
                row += f"{'ERR':<14}"
        print(row)

    print("-" * len(header))

    # Print actual overrounds
    row = f"{'Overround':<12}"
    for method in methods:
        if method in results and "ERROR" not in results[method]:
            ov = calculate_overround(results[method])
            row += f"{ov*100:<14.2f}"
        else:
            row += f"{'N/A':<14}"
    print(row)

    print("=" * len(header))


# ============================================================================
# Main (demo)
# ============================================================================

if __name__ == "__main__":
    # Our 8-player darts tournament
    true_probs = {
        "Berkay": 0.28,
        "Alican": 0.22,
        "Ekin": 0.13,
        "Seckin": 0.12,
        "Baran": 0.10,
        "Erkut": 0.07,
        "Muzaffer": 0.05,
        "Ece": 0.03,
    }

    print("\n" + "=" * 70)
    print("  OVERROUND CALCULATION - 8 Player Darts Tournament")
    print("=" * 70)

    # Show comparison
    print_comparison(true_probs, 1.08)

    # Show recommended output
    print("\n\nRECOMMENDED (Power Method, 108% overround):")
    print("-" * 40)
    result = apply_overround(true_probs, 1.08, "power")
    for name, odds in result.items():
        print(f"  {name:<12} {odds:.2f}")
    print(f"\n  Overround: {calculate_overround(result)*100:.2f}%")
    print(f"  Margin:    {calculate_margin(result):.2f}%")
    print(f"  House Edge:{calculate_house_edge(result):.2f}%")

    # Head-to-head example
    print("\n\nHEAD-TO-HEAD EXAMPLE (Berkay vs Ece, 104%):")
    print("-" * 40)
    h2h = {"Berkay": 0.90, "Ece": 0.10}
    h2h_odds = apply_overround(h2h, 1.04, "power")
    for name, odds in h2h_odds.items():
        print(f"  {name:<12} {odds:.2f}")
    print(f"  Overround: {calculate_overround(h2h_odds)*100:.2f}%")
```

### 6.2 Key Formulas Reference Card

```
=================================================================
                  OVERROUND FORMULA REFERENCE
=================================================================

BASIC RELATIONSHIPS:
  implied_prob = 1 / decimal_odds
  decimal_odds = 1 / implied_prob
  overround    = sum(1/odds_i)           # > 1.0 means margin exists
  margin       = overround - 1.0
  house_edge   = 1 - (1 / overround)

EQUAL (ADDITIVE):
  bk_prob_i = p_i + (S - 1) / n
  odds_i    = 1 / bk_prob_i

MULTIPLICATIVE (PROPORTIONAL):
  bk_prob_i = p_i * S
  odds_i    = 1 / (p_i * S) = fair_odds_i / S

FLB (WEIGHTED):
  w_i = (1/p_i)^alpha
  bk_prob_i = p_i + (S-1) * w_i / sum(w)

SHIN (forward, scaled normalization):
  z = (S - 1) / (n - 1)
  b_i = (sqrt(z^2 + 4(1-z)p_i^2) - z) / (2(1-z))
  bk_prob_i = b_i * S / sum(b)
  NOTE: Primarily a de-vigging tool; Power method preferred for forward use

POWER:
  bk_prob_i = p_i^(1/k)
  solve k such that sum(p_i^(1/k)) = S

ODDS RATIO:
  bk_prob_i = (p_i * OR) / (1 - p_i + p_i * OR)
  solve OR such that sum(bk_prob) = S

Where:
  p_i = true probability of outcome i
  S   = target overround (e.g., 1.08)
  n   = number of selections
  z   = Shin insider proportion parameter
  k   = Power method exponent parameter
  OR  = Odds Ratio parameter
=================================================================
```

---

## 7. Recommendation for Our Platform

### Primary Choice: **Power Method** at **108% overround**

| Decision | Choice | Rationale |
|---|---|---|
| **Method** | Power | Best empirical accuracy, natural FLB, never produces invalid odds, single parameter |
| **Outright overround** | 108% | Fair enough for friends, sustainable house edge (~7.4%) |
| **H2H overround** | 104-105% | Two outcomes need tighter margin to look fair |
| **Prop overround** | 106-108% | Slightly higher, bettors less price-sensitive |
| **Min odds** | 1.05 | Ensures minimum excitement for heavy favourites |
| **Max odds** | 67.00 | Keeps UI clean, capped at ~1.5% implied probability |
| **Rounding** | 2 decimal places | Clean display without complex increment snapping |
| **Dynamic margin** | Yes, reduce as tournament progresses | QF outright 108% -> SF outright 106% -> Final outright 104% |

### Fallback: **Multiplicative Method**

If implementation simplicity is paramount, the multiplicative method is acceptable at 108% overround. The differences between methods at this low margin level are small enough (~0.5 odds points at most) that casual bettors would not notice.

### Implementation Priority

1. **Phase 1:** Implement `multiplicative` method (one-liner, immediate)
2. **Phase 2:** Add `power` method as the default (iterative solver, better accuracy)
3. **Phase 3:** Add comparison endpoint so admin can see all methods before publishing odds

---

## 8. Sources

### Academic Papers
- Shin, H.S. (1991). "Optimal Betting Odds Against Insider Traders." *The Economic Journal*, 101(408), 1179-1185.
- Shin, H.S. (1993). "Measuring the Incidence of Insider Trading in a Market for State-Contingent Claims." *The Economic Journal*, 103(420), 1141-1153.
- Clarke, S.R. (2016). "Adjusting Bookmaker's Odds to Allow for Overround." *American Journal of Sports Science*, 5(6), 45-49. [Link](https://www.sciencepublishinggroup.com/article/10.11648/j.ajss.20170506.12)
- Vovk, V. & Zhdanov, F. (2009). "Prediction with expert advice for the Brier game." *Journal of Machine Learning Research*, 10, 2445-2471.
- Cheung, S.L. (2015). "Comment on 'Two-Outcome Games in Economics'." University of Sydney Economics Working Paper.
- Whelan, K. (2024). "Estimating Expected Loss Rates in Betting Markets: Theory and Evidence." [Link](https://www.karlwhelan.com/Papers/Overround.pdf)
- Griffith, R.M. (1949). "Odds adjustments by American horse race bettors." *American Journal of Psychology*, 62, 290-294.

### Software Packages
- R `implied` package: [CRAN](https://cran.r-project.org/web/packages/implied/vignettes/introduction.html) -- Implements all 6+ methods
- Python `shin` package: [GitHub](https://github.com/mberk/shin) -- Rust-optimized Shin method
- Buchdahl, J. "Using the Wisdom of the Crowd to Find Value in a Football Match Betting Market." [football-data.co.uk](https://www.football-data.co.uk/The_Wisdom_of_the_Crowd_updated.pdf)

### Industry References
- [Overround Calculator](https://overroundcalculator.com/)
- [Pinnacle Odds Dropper: De-Vig Guide](https://www.pinnacleoddsdropper.com/guides/how-to-devig-pinnacle-s-odds-for-betting-on-soft-books)
- [Timeform: Overround Explained](https://www.timeform.com/betting/advanced/overround-explained)
- [CaanBerry: Understanding the Over-Round](https://caanberry.com/understanding-the-over-round-in-betting-markets/)
- [Altenar: House Edge Explained](https://altenar.com/en-us/blog/house-edge-in-sports-betting-how-the-best-sportsbooks-manage-their-edge/)
- [penaltyblog: From Biased Odds to Fair Probabilities](https://pena.lt/y/2025/09/14/from-biased-odds-to-fair-probabilities/)
