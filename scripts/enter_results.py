"""Enter 27 new match results into the Fantasy Darts production backend.

Authenticates as admin, enters results sequentially, and reports final standings.
Each result triggers: DB write → Elo recalc → Monte Carlo → odds refresh.
"""

import sys
import time

import httpx

BASE = "https://backend-production-19be.up.railway.app"
ADMIN_EMAIL = "tmeren@gmail.com"

# 27 new results to enter (verified against Challonge screenshots 2026-02-25)
NEW_RESULTS = [
    # Round 33 (8 matches)
    {"match_id": 321, "score1": 2, "score2": 3, "winner": "Baran Yildiz"},
    {"match_id": 322, "score1": 1, "score2": 3, "winner": "Ece Saritepe"},
    {"match_id": 323, "score1": 3, "score2": 0, "winner": "Ekin Isik"},
    {"match_id": 324, "score1": 3, "score2": 0, "winner": "Alican Donerkaya"},
    {"match_id": 325, "score1": 3, "score2": 0, "winner": "Berkay Alpagot"},
    {"match_id": 326, "score1": 1, "score2": 3, "winner": "Seckin Civan"},
    {"match_id": 327, "score1": 3, "score2": 2, "winner": "Ali Celik"},
    {"match_id": 328, "score1": 2, "score2": 3, "winner": "Emre Ozorhan"},
    # Round 34 (8 matches)
    {"match_id": 331, "score1": 3, "score2": 2, "winner": "Seckin Civan"},
    {"match_id": 332, "score1": 0, "score2": 3, "winner": "Busra Caliskan"},
    {"match_id": 334, "score1": 3, "score2": 1, "winner": "Emre Ozorhan"},
    {"match_id": 335, "score1": 3, "score2": 0, "winner": "Baran Yildiz"},
    {"match_id": 337, "score1": 0, "score2": 3, "winner": "Alican Donerkaya"},
    {"match_id": 338, "score1": 3, "score2": 2, "winner": "Erkut Yaltkaya"},
    {"match_id": 339, "score1": 3, "score2": 2, "winner": "Ata Kemal Yukselen"},
    {"match_id": 340, "score1": 2, "score2": 3, "winner": "Muzaffer Akin"},
    # Round 35 (8 matches)
    {"match_id": 341, "score1": 3, "score2": 0, "winner": "Alican Donerkaya"},
    {"match_id": 342, "score1": 0, "score2": 3, "winner": "Ata Kemal Yukselen"},
    {"match_id": 343, "score1": 0, "score2": 3, "winner": "Erkut Yaltkaya"},
    {"match_id": 344, "score1": 3, "score2": 0, "winner": "Ekin Isik"},
    {"match_id": 345, "score1": 0, "score2": 3, "winner": "Ece Saritepe"},
    {"match_id": 346, "score1": 0, "score2": 3, "winner": "Baran Yildiz"},
    {"match_id": 347, "score1": 1, "score2": 3, "winner": "Emre Ozorhan"},
    {"match_id": 349, "score1": 3, "score2": 0, "winner": "Havva Ozkan"},
    # Round 36 (1 match)
    {"match_id": 353, "score1": 0, "score2": 3, "winner": "Yasar Ulucan"},
    # Round 37 (1 match)
    {"match_id": 368, "score1": 3, "score2": 0, "winner": "Yusuf Cura"},
    # Round 38 (1 match)
    {"match_id": 374, "score1": 0, "score2": 3, "winner": "Berkay Alpagot"},
]


def main():
    client = httpx.Client(base_url=BASE, timeout=120.0)

    # Step 0: Health check
    print("=" * 60)
    print("FANTASY DARTS — SCORE UPDATE SCRIPT")
    print("=" * 60)
    health = client.get("/api/health").json()
    print(f"Health: {health['status']}, DB: {health['database']}")

    # Step 1: Authenticate as admin
    print("\n--- Authenticating as admin ---")
    resp = client.post("/api/auth/login", json={"email": ADMIN_EMAIL})
    if resp.status_code != 200:
        print(f"FATAL: Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Authenticated as {ADMIN_EMAIL}")

    # Step 2: Verify current state — check which matches are already completed
    print("\n--- Verifying current state (V186) ---")
    upcoming = client.get("/api/tournament/upcoming").json()
    scheduled_ids = {m["match_id"] for m in upcoming}
    print(f"Currently scheduled matches: {len(scheduled_ids)}")

    # Check each of our 27 results is still scheduled
    ready = []
    already_done = []
    for r in NEW_RESULTS:
        mid = r["match_id"]
        if mid in scheduled_ids:
            ready.append(r)
        else:
            already_done.append(r)

    if already_done:
        print(f"WARNING: {len(already_done)} matches already completed:")
        for r in already_done:
            print(f"  M{r['match_id']}: already done, SKIPPING")

    print(f"Ready to enter: {len(ready)} matches")

    # Step 3: Enter results sequentially (with retry on timeout)
    print("\n--- Entering results ---")
    success = 0
    failed = 0
    for i, r in enumerate(ready, 1):
        mid = r["match_id"]
        for attempt in range(3):
            try:
                resp = client.post("/api/admin/enter-result", json=r, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    print(
                        f"  [{i:2d}/{len(ready)}] M{mid}: {data['winner']} wins {data['score']} ✓"
                    )
                    success += 1
                else:
                    print(
                        f"  [{i:2d}/{len(ready)}] M{mid}: FAILED {resp.status_code} — {resp.text[:200]}"
                    )
                    failed += 1
                break
            except httpx.ReadTimeout:
                if attempt < 2:
                    print(f"  [{i:2d}/{len(ready)}] M{mid}: timeout, retrying ({attempt+1}/3)...")
                    time.sleep(3)
                else:
                    print(f"  [{i:2d}/{len(ready)}] M{mid}: TIMEOUT after 3 attempts")
                    failed += 1

    print(f"\nResults: {success} succeeded, {failed} failed out of {len(ready)}")

    # Step 4: Fetch updated standings
    print("\n--- Updated Standings ---")
    standings = client.get("/api/tournament/standings").json()
    print(
        f"{'#':<3} {'Player':<25} {'P':>3} {'W':>3} {'L':>3} {'D':>3} {'LF':>4} {'LA':>4} {'Diff':>5} {'Elo':>7}"
    )
    print("-" * 70)
    for i, s in enumerate(standings, 1):
        print(
            f"{i:<3} {s['player']:<25} {s['played']:>3} {s['wins']:>3} "
            f"{s['losses']:>3} {s['draws']:>3} {s['legs_for']:>4} "
            f"{s['legs_against']:>4} {s['leg_diff']:>+5} {s['elo']:>7.1f}"
        )

    # Step 5: Fetch updated odds
    print("\n--- Updated Tournament Winner Odds (Top 10) ---")
    try:
        odds = client.get("/api/admin/current-odds", headers=headers).json()
        print(f"{'#':<3} {'Player':<25} {'Win%':>6} {'Top8%':>6} {'Odds':>7}")
        print("-" * 55)
        for i, o in enumerate(odds[:10], 1):
            win_pct = round(o["true_probability"] * 100, 1)
            print(
                f"{i:<3} {o['player']:<25} {win_pct:>5.1f}% {o['top8_pct']:>5.1f}% {o['odds']:>7.2f}"
            )
    except Exception as e:
        print(f"Could not fetch odds: {e}")

    # Step 6: Check remaining scheduled matches
    remaining = client.get("/api/tournament/upcoming").json()
    print(f"\n--- Remaining scheduled matches: {len(remaining)} ---")

    # Step 7: M330 status
    print("\n--- M330 Status ---")
    print("M330 requires direct DB fix (0-0 double forfeit).")
    print("Current DB state: Okan Duman 0 - Mehmet Ovali 3 (WRONG)")
    print("Required: score1=0, score2=0, winner=NULL, is_draw=true")
    print(
        "SQL: UPDATE matches SET score1=0, score2=0, winner=NULL, is_draw=true WHERE match_id=330;"
    )
    print("This must be run directly on Railway PostgreSQL.")

    client.close()
    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
