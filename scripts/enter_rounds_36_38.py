"""Enter rounds 36-38 match results + void old bets (surgical refund).

Flow:
  1. Authenticate as admin
  2. Void bets on rounds 1-35 matches (surgical refund per user, tournament winner bets kept)
  3. Enter remaining round 36-38 results (skips already-completed)
  4. Each enter-result auto-settles match + prop markets + logs to activity feed
  5. Print updated standings + user balances
  6. Check remaining open markets

Usage:
  pip install httpx
  python scripts/enter_rounds_36_38.py --local           # Test against local dev
  python scripts/enter_rounds_36_38.py --password PASS    # Run against production
  python scripts/enter_rounds_36_38.py --dry-run          # Show what would happen
"""

import argparse
import getpass
import sys
import time

import httpx

PROD_BASE = "https://backend-production-19be.up.railway.app"
LOCAL_BASE = "http://localhost:8000"
ADMIN_EMAIL = "tmeren@gmail.com"

# Rounds 36-38 results (extracted from Challonge screenshot 2026-02-26)
# Matches 351, 352, 353, 367, 368, 369, 373, 374, 375 already entered previously
NEW_RESULTS = [
    # Round 36 — 7 remaining (351, 352, 353 already done)
    {"match_id": 354, "score1": 0, "score2": 3, "winner": "Ali Celik"},
    {"match_id": 355, "score1": 3, "score2": 2, "winner": "Emre Ozorhan"},
    {"match_id": 356, "score1": 2, "score2": 3, "winner": "Alican Donerkaya"},
    {"match_id": 357, "score1": 1, "score2": 3, "winner": "Ekin Isik"},
    {"match_id": 358, "score1": 0, "score2": 3, "winner": "Selda Yesiltas"},
    {"match_id": 359, "score1": 3, "score2": 2, "winner": "Erkut Yaltkaya"},
    {"match_id": 360, "score1": 3, "score2": 1, "winner": "Ata Kemal Yukselen"},
    # Round 37 — 7 remaining (367, 368, 369 already done)
    {"match_id": 361, "score1": 3, "score2": 0, "winner": "Muzaffer Akin"},
    {"match_id": 362, "score1": 2, "score2": 3, "winner": "Erkut Yaltkaya"},
    {"match_id": 363, "score1": 3, "score2": 2, "winner": "Ali Celik"},
    {"match_id": 364, "score1": 2, "score2": 3, "winner": "Seckin Civan"},
    {"match_id": 365, "score1": 3, "score2": 2, "winner": "Ekin Isik"},
    {"match_id": 366, "score1": 3, "score2": 1, "winner": "Alican Donerkaya"},
    {"match_id": 370, "score1": 3, "score2": 0, "winner": "Havva Ozkan"},
    # Round 38 — 7 remaining (373, 374, 375 already done)
    {"match_id": 371, "score1": 0, "score2": 3, "winner": "Yasar Ulucan"},
    {"match_id": 372, "score1": 2, "score2": 3, "winner": "Ali Celik"},
    {"match_id": 376, "score1": 3, "score2": 2, "winner": "Emre Ozorhan"},
    {"match_id": 377, "score1": 3, "score2": 1, "winner": "Baran Yildiz"},
    {"match_id": 378, "score1": 3, "score2": 1, "winner": "Seckin Civan"},
    {"match_id": 379, "score1": 0, "score2": 3, "winner": "Ece Saritepe"},
    {"match_id": 380, "score1": 1, "score2": 3, "winner": "Ata Kemal Yukselen"},
]


def main():
    parser = argparse.ArgumentParser(description="Enter rounds 36-38 results")
    parser.add_argument("--password", help="Admin password (will prompt if not given)")
    parser.add_argument("--skip-void", action="store_true", help="Skip void-old-bets step")
    parser.add_argument("--local", action="store_true", help="Run against local dev server")
    parser.add_argument(
        "--dry-run", action="store_true", help="Show what would happen without executing"
    )
    args = parser.parse_args()

    base = LOCAL_BASE if args.local else PROD_BASE
    password = args.password or getpass.getpass("Admin password: ")

    client = httpx.Client(base_url=base, timeout=120.0)

    print("=" * 60)
    print("FANTASY DARTS — ROUNDS 36-38 ENTRY")
    print(f"Target: {base}")
    print("=" * 60)

    # Health check
    health = client.get("/api/health").json()
    print(f"Health: {health['status']}, DB: {health['database']}")

    # Authenticate
    print("\n--- Authenticating as admin ---")
    resp = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": password})
    if resp.status_code != 200:
        print(f"FATAL: Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Authenticated as {ADMIN_EMAIL}")

    if args.dry_run:
        print("\n*** DRY RUN — no changes will be made ***\n")

    # Step 1: Void old bets (rounds 1-35) — surgical refund, tournament winner bets kept
    if not args.skip_void:
        print("\n--- Step 1: Void bets on rounds 1-35 (surgical refund) ---")
        print("  Tournament winner (outright) bets: KEPT")
        print("  Rounds 36-38 bets: KEPT for normal settlement")
        if args.dry_run:
            print("  [DRY RUN] Would call POST /admin/void-old-bets?cutoff_round=35")
        else:
            resp = client.post("/api/admin/void-old-bets?cutoff_round=35", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                print(f"  Voided: {data['voided_count']} bets")
                print(f"  Refunded: {data['refunded_total']} RTB (back to user accounts)")
                print(f"  Markets closed: {data['markets_closed']}")
                print(f"  Users affected: {data.get('users_affected', 'N/A')}")
            else:
                print(f"  FAILED: {resp.status_code} {resp.text[:300]}")
    else:
        print("\n--- Step 1: SKIPPED (--skip-void) ---")

    # Step 2: Show user balances after void
    print("\n--- Step 2: User balances after void ---")
    resp = client.get("/api/admin/user-balances", headers=headers)
    if resp.status_code == 200:
        balances = resp.json()
        for u in balances:
            marker = " *" if u["balance"] != 1000.0 else ""
            print(f"  {u['name']:<25} {u['balance']:>8.0f} RTB{marker}")
        if any(u["balance"] != 1000.0 for u in balances):
            print("  (* = balance differs from starting 1000 RTB)")
    else:
        print(f"  Could not fetch balances: {resp.status_code}")

    # Step 3: Verify which matches are still scheduled
    print("\n--- Step 3: Checking scheduled matches ---")
    upcoming = client.get("/api/tournament/upcoming").json()
    scheduled_ids = {m["match_id"] for m in upcoming}
    print(f"  Currently scheduled: {len(scheduled_ids)} matches")

    ready = []
    already_done = []
    for r in NEW_RESULTS:
        if r["match_id"] in scheduled_ids:
            ready.append(r)
        else:
            already_done.append(r)

    if already_done:
        print(f"  Already completed ({len(already_done)}): {[r['match_id'] for r in already_done]}")
    print(f"  Ready to enter: {len(ready)} matches")

    # Step 4: Enter results (each triggers auto-settlement + activity feed)
    print("\n--- Step 4: Entering round 36-38 results ---")
    print("  Each result auto-settles match markets + logs wins/losses to activity feed")
    success = 0
    failed = 0
    for i, r in enumerate(ready, 1):
        mid = r["match_id"]
        if args.dry_run:
            print(
                f"  [{i:2d}/{len(ready)}] M{mid}: {r['winner']} wins "
                f"{r['score1']}-{r['score2']} [DRY RUN]"
            )
            success += 1
            continue

        for attempt in range(3):
            try:
                resp = client.post("/api/admin/enter-result", json=r, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    print(
                        f"  [{i:2d}/{len(ready)}] M{mid}: {data['winner']} "
                        f"wins {data['score']} ✓"
                    )
                    success += 1
                else:
                    print(
                        f"  [{i:2d}/{len(ready)}] M{mid}: FAILED "
                        f"{resp.status_code} — {resp.text[:200]}"
                    )
                    failed += 1
                break
            except (httpx.ReadTimeout, httpx.ReadError, httpx.ConnectError) as exc:
                if attempt < 2:
                    print(
                        f"  [{i:2d}/{len(ready)}] M{mid}: {type(exc).__name__}, "
                        f"retrying ({attempt + 1}/3) after 5s..."
                    )
                    time.sleep(5)
                else:
                    print(
                        f"  [{i:2d}/{len(ready)}] M{mid}: FAILED after 3 attempts ({type(exc).__name__})"
                    )
                    failed += 1

        time.sleep(0.5)  # Brief pause between requests to avoid overwhelming local server

    print(f"\n  Results: {success} succeeded, {failed} failed")

    if args.dry_run:
        print("\n*** DRY RUN COMPLETE — no changes were made ***")
        client.close()
        return

    # Step 5: Updated standings
    print("\n--- Step 5: Updated Standings ---")
    standings = client.get("/api/tournament/standings").json()
    print(
        f"{'#':<3} {'Player':<25} {'P':>3} {'W':>3} {'L':>3} "
        f"{'D':>3} {'LF':>4} {'LA':>4} {'Diff':>5}"
    )
    print("-" * 65)
    for i, s in enumerate(standings, 1):
        print(
            f"{i:<3} {s['player']:<25} {s['played']:>3} {s['wins']:>3} "
            f"{s['losses']:>3} {s['draws']:>3} {s['legs_for']:>4} "
            f"{s['legs_against']:>4} {s['leg_diff']:>+5}"
        )

    # Step 6: Final user balances
    print("\n--- Step 6: Final User Balances ---")
    resp = client.get("/api/admin/user-balances", headers=headers)
    if resp.status_code == 200:
        balances = resp.json()
        for u in balances:
            print(f"  {u['name']:<25} {u['balance']:>8.0f} RTB")

    # Step 7: Check remaining matches
    remaining = client.get("/api/tournament/upcoming").json()
    print(f"\n--- Remaining scheduled matches: {len(remaining)} ---")
    if remaining:
        for m in remaining:
            print(f"  R{m['round']} M{m['match_id']}: {m['player1']} vs {m['player2']}")
    else:
        print("  All league matches complete!")

    # Step 8: Check open markets
    markets = client.get("/api/markets?status=open", headers=headers).json()
    print(f"\n--- Open markets remaining: {len(markets)} ---")
    for m in markets:
        print(f"  [{m['market_type']}] {m['name']} — {m['total_staked']:.0f} RTB staked")

    client.close()
    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
