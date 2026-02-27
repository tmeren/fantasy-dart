# Fantasy Darts — Score Discrepancy Report

> **Source of truth:** Challonge tournament bracket (screenshots verified 2026-02-25)
> **Compared against:** Railway production DB (`backend-production-19be.up.railway.app`)
> **Purpose:** Share with umpire for validation before applying corrections

---

## Summary

| Batch | Rounds | Matches Checked | Discrepancies | Root Cause |
|-------|--------|----------------|---------------|------------|
| 1 | 1-7 | 70 | 5 | Mehmet Ovali disqualification — forfeit wins not applied |
| 2 | 8-14 | 70 | 6 | Same + draw corrections for Mehmet/Okan/Veli matches |
| 3 | 15-21 | 70 | 3 | Mehmet forfeit scores (correct winner, wrong leg counts) |
| 4 | 22-28 | 70 | 1 | Mehmet forfeit score fix |
| 5 | 29-38 | 79 | 2 | Score fix + M330 draw (already identified) |
| **Total** | **1-38** | **359** | **17** | **All completed matches audited** |

---

## Discrepancy Table

| # | M# | Round | Player 1 | Player 2 | Challonge (Correct) | Railway DB (Current) | Fix Type |
|---|-----|-------|----------|----------|--------------------|--------------------|----------|
| 1 | M7 | R1 | Mehmet Ovali | Alican Donerkaya | 0-3 → Alican wins | 3-0 → Mehmet wins | WIN FLIP |
| 2 | M15 | R2 | Ekin Isik | Mehmet Ovali | 3-0 → Ekin wins | 0-3 → Mehmet wins | WIN FLIP |
| 3 | M26 | R3 | Mehmet Ovali | Selda Yesiltas | 0-3 → Selda wins | 3-1 → Mehmet wins | WIN FLIP |
| 4 | M36 | R4 | Muzaffer Akin | Mehmet Ovali | 3-0 → Muzaffer wins | 3-2 → Muzaffer wins | SCORE FIX |
| 5 | M64 | R7 | Mehmet Ovali | Erkut Yaltkaya | 0-3 → Erkut wins | 1-3 → Erkut wins | SCORE FIX |
| 6 | M71 | R8 | Nurten Yilmaz | Mehmet Ovali | 3-0 → Nurten wins | 3-1 → Nurten wins | SCORE FIX |
| 7 | M83 | R9 | Mehmet Ovali | Seckin Civan | 0-3 → Seckin wins | 2-3 → Seckin wins | SCORE FIX |
| 8 | M102 | R11 | Mehmet Ovali | Emre Ozorhan | 0-3 → Emre wins | 3-2 → Mehmet wins | WIN FLIP |
| 9 | M120 | R12 | Veli Metli | Mehmet Ovali | 0-0 → DRAW | 0-3 → Mehmet wins | → DRAW |
| 10 | M128 | R13 | Ali Celik | Mehmet Ovali | 3-0 → Ali wins | 0-3 → Mehmet wins | WIN FLIP |
| 11 | M140 | R14 | Mehmet Ovali | Okan Duman | 0-0 → DRAW | 3-0 → Mehmet wins | → DRAW |
| 12 | M163 | R17 | Yasar Ulucan | Mehmet Ovali | 3-0 → Yasar wins | 2-1 → Yasar wins | SCORE FIX |
| 13 | M178 | R18 | Mehmet Ovali | Yusuf Cura | 0-3 → Yusuf wins | 1-3 → Yusuf wins | SCORE FIX |
| 14 | M184 | R19 | Berkay Alpagot | Mehmet Ovali | 3-0 → Berkay wins | 3-2 → Berkay wins | SCORE FIX |
| 15 | M216 | R22 | Selda Yesiltas | Mehmet Ovali | 3-0 → Selda wins | 3-1 → Selda wins | SCORE FIX |
| 16 | M289 | R29 | Mehmet Ovali | Baran Yildiz | 0-3 → Baran wins | 1-3 → Baran wins | SCORE FIX |
| 17 | M330 | R33 | Okan Duman | Mehmet Ovali | 0-0 → DRAW | 0-3 → Mehmet wins | → DRAW |

---

## Fix Type Legend

| Type | Description | Count |
|------|-------------|-------|
| **WIN FLIP** | Wrong winner — opponent should have won 3-0 (forfeit) | 5 |
| **SCORE FIX** | Correct winner, wrong score — should be 3-0 or 0-3 (forfeit) | 9 |
| **→ DRAW** | Should be 0-0 draw (both players forfeited / disqualified pair) | 3 |

---

## SQL Correction Statements

```sql
-- Fantasy Darts Score Corrections
-- ALL ROUNDS 1-38 (17 corrections)
-- Validated against Challonge screenshots 2026-02-25

BEGIN;

-- Batch 1: Rounds 1-7 (5 corrections)
UPDATE matches SET score1=0, score2=3, winner='Alican Donerkaya', is_draw=false WHERE match_id=7;
UPDATE matches SET score1=3, score2=0, winner='Ekin Isik', is_draw=false WHERE match_id=15;
UPDATE matches SET score1=0, score2=3, winner='Selda Yesiltas', is_draw=false WHERE match_id=26;
UPDATE matches SET score1=3, score2=0, winner='Muzaffer Akin', is_draw=false WHERE match_id=36;
UPDATE matches SET score1=0, score2=3, winner='Erkut Yaltkaya', is_draw=false WHERE match_id=64;

-- Batch 2: Rounds 8-14 (6 corrections)
UPDATE matches SET score1=3, score2=0, winner='Nurten Yilmaz', is_draw=false WHERE match_id=71;
UPDATE matches SET score1=0, score2=3, winner='Seckin Civan', is_draw=false WHERE match_id=83;
UPDATE matches SET score1=0, score2=3, winner='Emre Ozorhan', is_draw=false WHERE match_id=102;
UPDATE matches SET score1=0, score2=0, winner=NULL, is_draw=true WHERE match_id=120;
UPDATE matches SET score1=3, score2=0, winner='Ali Celik', is_draw=false WHERE match_id=128;
UPDATE matches SET score1=0, score2=0, winner=NULL, is_draw=true WHERE match_id=140;

-- Batch 3: Rounds 15-21 (3 corrections)
UPDATE matches SET score1=3, score2=0, winner='Yasar Ulucan', is_draw=false WHERE match_id=163;
UPDATE matches SET score1=0, score2=3, winner='Yusuf Cura', is_draw=false WHERE match_id=178;
UPDATE matches SET score1=3, score2=0, winner='Berkay Alpagot', is_draw=false WHERE match_id=184;

-- Batch 4: Rounds 22-28 (1 correction)
UPDATE matches SET score1=3, score2=0, winner='Selda Yesiltas', is_draw=false WHERE match_id=216;

-- Batch 5: Rounds 29-38 (2 corrections)
UPDATE matches SET score1=0, score2=3, winner='Baran Yildiz', is_draw=false WHERE match_id=289;
UPDATE matches SET score1=0, score2=0, winner=NULL, is_draw=true WHERE match_id=330;

COMMIT;

-- After all corrections: trigger full Elo recalc via admin API
-- POST /api/admin/recalculate-elo (with admin Bearer token)
```

---

## Impact Analysis

### Players affected by corrections:

| Player | Wins Added | Wins Removed | Draws Added | Net Change |
|--------|-----------|-------------|-------------|------------|
| Alican Donerkaya | +1 | — | — | +1W |
| Ekin Isik | +1 | — | — | +1W |
| Selda Yesiltas | +1 | — | — | +1W |
| Emre Ozorhan | +1 | — | — | +1W |
| Ali Celik | +1 | — | — | +1W |
| Baran Yildiz | — | — | — | score fix only |
| Mehmet Ovali | — | -8 | +3 | -8W, +3D (keeps 1W vs Veli) |
| Veli Metli | — | — | +1 | +1D (was loss) |
| Okan Duman | — | — | +2 | +2D (was losses) |

### Score adjustments (legs):
- 9 matches: score changed from actual to 3-0/0-3 forfeit (minor leg count changes)
- 3 matches: converted to 0-0 draw (legs removed)

### Key observations:
- **M310 (R31)**: Mehmet 3-0 Veli — stays as-is. This is Mehmet's only legitimate win.
- **M312 (R32)**: Veli 3-0 Okan — stays as-is. This is Veli's only legitimate win.
- **M122 (R13)**: Okan 0-0 Veli — already correct in Railway DB (draw).

---

## Audit Complete

- [x] **Batch 1**: Rounds 1-7 — 5 discrepancies (3 win flips, 2 score fixes)
- [x] **Batch 2**: Rounds 8-14 — 6 discrepancies (2 win flips, 2 score fixes, 2 draws)
- [x] **Batch 3**: Rounds 15-21 — 3 discrepancies (all score fixes)
- [x] **Batch 4**: Rounds 22-28 — 1 discrepancy (score fix)
- [x] **Batch 5**: Rounds 29-38 — 2 discrepancies (1 score fix, 1 draw)

**All 359 completed matches audited. 17 corrections needed. 21 matches still scheduled.**

---

## Post-Correction Expected Standings

After applying all 17 SQL corrections + full Elo recalc, Railway standings should match Challonge exactly.

---

*Generated: 2026-02-25 | Full audit across 5 Challonge screenshot batches*
