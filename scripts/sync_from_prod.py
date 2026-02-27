"""Sync local SQLite database from production Railway API.

Pulls match results, users, markets, selections, bets, and activity data
from production and populates the local DB to mirror production state.

Usage:
  cd side-projects/SP16-fantasy-dart
  source backend/.venv/bin/activate
  python3 scripts/sync_from_prod.py --password PASS        # Full sync
  python3 scripts/sync_from_prod.py --matches-only          # Only sync match results
  python3 scripts/sync_from_prod.py --dry-run               # Show what would be synced
"""

import argparse
import sqlite3
import sys
import time

import httpx

PROD_BASE = "https://backend-production-19be.up.railway.app"
LOCAL_DB_PATH = "backend/darts_betting.db"
ADMIN_EMAIL = "tmeren@gmail.com"

# Railway can be slow to wake up — retry with backoff
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds


def fetch_prod(endpoint: str, token: str | None = None) -> dict | list:
    """Fetch data from production API with retry for Railway cold starts."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(f"{PROD_BASE}{endpoint}", headers=headers, timeout=60.0)
            if resp.status_code != 200:
                print(f"  WARN: {endpoint} returned {resp.status_code}")
                return []
            return resp.json()
        except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as e:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                print(
                    f"  Connection issue ({e.__class__.__name__}), retrying in {wait}s... ({attempt + 1}/{MAX_RETRIES})"
                )
                time.sleep(wait)
            else:
                print(f"  FATAL: {endpoint} failed after {MAX_RETRIES} attempts: {e}")
                return []


def post_prod(endpoint: str, json_data: dict, token: str | None = None) -> httpx.Response | None:
    """POST to production API with retry."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    for attempt in range(MAX_RETRIES):
        try:
            return httpx.post(
                f"{PROD_BASE}{endpoint}", json=json_data, headers=headers, timeout=60.0
            )
        except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as e:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                print(f"  Connection issue, retrying in {wait}s... ({attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
            else:
                print(f"  FATAL: POST {endpoint} failed after {MAX_RETRIES} attempts: {e}")
                return None


def authenticate(password: str) -> str:
    """Authenticate against production and return JWT token."""
    resp = post_prod("/api/auth/login", {"email": ADMIN_EMAIL, "password": password})
    if resp is None or resp.status_code != 200:
        print(
            f"FATAL: Login failed: {resp.status_code if resp else 'no response'} {resp.text if resp else ''}"
        )
        sys.exit(1)
    return resp.json()["access_token"]


def ensure_db_tables(db_path: str):
    """Create all required SQLite tables if they don't exist."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            balance FLOAT DEFAULT 1000.0,
            is_admin BOOLEAN DEFAULT 0,
            password_hash VARCHAR(255),
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            magic_token VARCHAR(255),
            magic_token_expires TIMESTAMP,
            privacy_consent BOOLEAN DEFAULT 0,
            terms_consent BOOLEAN DEFAULT 0,
            age_confirmed BOOLEAN DEFAULT 0,
            whatsapp_consent BOOLEAN DEFAULT 0,
            consent_timestamp TIMESTAMP,
            phone_number VARCHAR(255),
            whatsapp_opted_in BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round INTEGER NOT NULL,
            match_id INTEGER UNIQUE NOT NULL,
            player1 VARCHAR(100) NOT NULL,
            player2 VARCHAR(100) NOT NULL,
            score1 INTEGER,
            score2 INTEGER,
            status VARCHAR(20) DEFAULT 'Scheduled',
            winner VARCHAR(100),
            is_draw BOOLEAN DEFAULT 0,
            total_180s INTEGER,
            highest_checkout INTEGER,
            p1_180 BOOLEAN DEFAULT 0,
            p2_180 BOOLEAN DEFAULT 0,
            p1_ton_checkout BOOLEAN DEFAULT 0,
            p2_ton_checkout BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS markets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            market_type VARCHAR(50) NOT NULL,
            betting_type VARCHAR(20) DEFAULT 'parimutuel',
            house_cut FLOAT DEFAULT 0.10,
            status VARCHAR(20) DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closes_at TIMESTAMP,
            settled_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS selections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            market_id INTEGER NOT NULL REFERENCES markets(id),
            name VARCHAR(200) NOT NULL,
            odds FLOAT NOT NULL DEFAULT 1.0,
            pool_total FLOAT DEFAULT 0.0,
            is_winner BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            selection_id INTEGER NOT NULL REFERENCES selections(id),
            stake FLOAT NOT NULL,
            odds_at_time FLOAT NOT NULL,
            potential_win FLOAT NOT NULL,
            actual_payout FLOAT,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            settled_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_type VARCHAR(50) NOT NULL,
            user_id INTEGER REFERENCES users(id),
            message TEXT NOT NULL,
            data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    conn.close()
    print("  DB tables ensured")


def sync_matches(db_path: str, dry_run: bool = False):
    """Sync match results from production to local DB."""
    print("\n--- Syncing match results from production ---")

    results = fetch_prod("/api/tournament/results")
    print(f"  Production completed matches: {len(results)}")

    upcoming = fetch_prod("/api/tournament/upcoming")
    print(f"  Production scheduled matches: {len(upcoming)}")

    if dry_run:
        print("  [DRY RUN] Would update local matches table")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # First, seed matches from CSV if table is empty
    cur.execute("SELECT COUNT(*) FROM matches")
    if cur.fetchone()[0] == 0:
        print("  Local matches table is empty — seeding from CSV...")
        _seed_matches_from_csv(cur)

    # Force-update ALL completed matches from production (overwrite CSV scores)
    updated = 0
    for m in results:
        cur.execute(
            """UPDATE matches SET
                score1 = ?, score2 = ?, status = 'Completed',
                winner = ?, is_draw = ?
            WHERE match_id = ?""",
            (
                m.get("score1"),
                m.get("score2"),
                m.get("winner"),
                m.get("is_draw", False),
                m["match_id"],
            ),
        )
        if cur.rowcount > 0:
            updated += 1

    conn.commit()
    conn.close()
    print(f"  Updated {updated} matches from Scheduled → Completed")


def _seed_matches_from_csv(cur):
    """Seed matches table from tournament_database.csv."""
    import csv
    import os

    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "tournament_database.csv")
    csv_path = os.path.normpath(csv_path)

    if not os.path.exists(csv_path):
        print(f"  WARN: CSV not found at {csv_path}")
        return

    with open(csv_path) as f:
        reader = csv.DictReader(f)
        # CSV has escaped underscores: Match\_ID, Player\_1, etc.
        count = 0
        for row in reader:
            # Normalize keys — strip backslashes
            r = {k.replace("\\", ""): v for k, v in row.items()}
            match_id = int(r["Match_ID"])
            round_num = int(r["Round"])
            player1 = r["Player_1"].strip()
            player2 = r["Player_2"].strip()
            s1 = r.get("Score_1", "").strip()
            s2 = r.get("Score_2", "").strip()
            score1 = int(s1) if s1 else None
            score2 = int(s2) if s2 else None
            status = r.get("Status", "Scheduled").strip()
            winner = r.get("Winner", "").strip() or None
            is_draw = False

            cur.execute(
                """INSERT OR IGNORE INTO matches
                   (round, match_id, player1, player2, score1, score2, status, winner, is_draw)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (round_num, match_id, player1, player2, score1, score2, status, winner, is_draw),
            )
            count += 1
        print(f"  Seeded {count} matches from CSV")


def sync_users(db_path: str, token: str, dry_run: bool = False):
    """Sync users from production leaderboard to local DB."""
    print("\n--- Syncing users from production ---")

    leaderboard = fetch_prod("/api/leaderboard")
    print(f"  Production users: {len(leaderboard)}")

    balances = fetch_prod("/api/admin/user-balances", token)
    balance_map = {u["name"]: u for u in balances} if balances else {}

    if dry_run:
        for entry in leaderboard:
            u = entry["user"]
            bal = balance_map.get(u["name"], {})
            print(
                f"  [DRY RUN] Would create/update: {u['name']} — {bal.get('balance', u['balance']):.0f} RTB"
            )
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    created = 0
    updated = 0
    for entry in leaderboard:
        u = entry["user"]
        bal_info = balance_map.get(u["name"], {})
        balance = bal_info.get("balance", u["balance"])
        email = bal_info.get("email", f"{u['name'].lower().replace(' ', '.')}@placeholder.local")

        # Check if user already exists by name
        cur.execute("SELECT id FROM users WHERE name = ?", (u["name"],))
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE users SET balance = ? WHERE name = ?", (balance, u["name"]))
            updated += 1
            continue

        cur.execute(
            """INSERT INTO users (email, name, balance, is_admin, is_active,
               privacy_consent, terms_consent, age_confirmed)
            VALUES (?, ?, ?, 0, 1, 1, 1, 1)""",
            (email, u["name"], balance),
        )
        created += 1

    conn.commit()
    conn.close()
    print(f"  Created {created} users, updated {updated} existing")


def sync_markets(db_path: str, dry_run: bool = False):
    """Sync markets and selections from production to local DB."""
    print("\n--- Syncing markets from production ---")

    open_markets = fetch_prod("/api/markets?status=open")
    settled_markets = fetch_prod("/api/markets?status=settled")
    closed_markets = fetch_prod("/api/markets?status=closed")
    voided_markets = fetch_prod("/api/markets?status=void")

    all_markets = open_markets + settled_markets + closed_markets + voided_markets
    print(
        f"  Production markets: {len(all_markets)} "
        f"(open={len(open_markets)}, settled={len(settled_markets)}, "
        f"closed={len(closed_markets)}, void={len(voided_markets)})"
    )

    if dry_run:
        for m in all_markets[:10]:
            print(f"  [DRY RUN] Would create: [{m['market_type']}] {m['name']} ({m['status']})")
        if len(all_markets) > 10:
            print(f"  [DRY RUN] ... and {len(all_markets) - 10} more")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    created_markets = 0
    created_selections = 0
    for m in all_markets:
        cur.execute("SELECT id FROM markets WHERE name = ?", (m["name"],))
        if cur.fetchone():
            continue

        cur.execute(
            """INSERT INTO markets (name, description, market_type, betting_type,
               house_cut, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                m["name"],
                m.get("description"),
                m["market_type"],
                m.get("betting_type", "parimutuel"),
                m.get("house_cut", 0.10),
                m["status"],
                m.get("created_at"),
            ),
        )
        market_id = cur.lastrowid
        created_markets += 1

        for sel in m.get("selections", []):
            cur.execute(
                """INSERT INTO selections (market_id, name, odds, pool_total, is_winner)
                VALUES (?, ?, ?, ?, ?)""",
                (
                    market_id,
                    sel["name"],
                    sel.get("odds", 1.0),
                    sel.get("pool_total", 0.0),
                    sel.get("is_winner", False),
                ),
            )
            created_selections += 1

    conn.commit()
    conn.close()
    print(f"  Created {created_markets} markets with {created_selections} selections")


def print_summary(db_path: str):
    """Print summary of local DB state after sync."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM matches WHERE status = 'Completed'")
    completed = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM matches WHERE status = 'Scheduled'")
    scheduled = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM users")
    users = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM markets")
    markets = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM selections")
    selections = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM bets")
    bets = cur.fetchone()[0]

    conn.close()

    print("\n" + "=" * 60)
    print("LOCAL DB SUMMARY")
    print("=" * 60)
    print(f"  Matches:    {completed} completed, {scheduled} scheduled")
    print(f"  Users:      {users}")
    print(f"  Markets:    {markets}")
    print(f"  Selections: {selections}")
    print(f"  Bets:       {bets}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Sync local DB from production")
    parser.add_argument("--password", help="Admin password for production")
    parser.add_argument("--matches-only", action="store_true", help="Only sync match results")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen")
    parser.add_argument("--db", default=LOCAL_DB_PATH, help="Path to local SQLite DB")
    args = parser.parse_args()

    print("=" * 60)
    print("SYNC LOCAL DB FROM PRODUCTION")
    print(f"Source: {PROD_BASE}")
    print(f"Target: {args.db}")
    print("=" * 60)

    # Step 0: Ensure DB tables exist
    print("\n--- Ensuring local DB tables ---")
    ensure_db_tables(args.db)

    # Step 1: Wake up Railway + health check
    print("\n--- Checking production health ---")
    print("  (Railway may take 10-15s to wake up...)")
    health = fetch_prod("/api/health")
    if not health:
        print("FATAL: Cannot reach production API. Is Railway running?")
        sys.exit(1)
    print(f"  Production health: {health.get('status', 'unknown')}")

    token = None
    if args.password and not args.matches_only:
        print("\n--- Authenticating as admin ---")
        token = authenticate(args.password)
        print("  Authenticated successfully")

    # Step 2: Sync match results (always)
    sync_matches(args.db, dry_run=args.dry_run)

    if not args.matches_only:
        # Step 3: Sync users
        if token:
            sync_users(args.db, token, dry_run=args.dry_run)
        else:
            print("\n--- Skipping user sync (no --password provided) ---")

        # Step 4: Sync markets + selections
        sync_markets(args.db, dry_run=args.dry_run)

    if not args.dry_run:
        print_summary(args.db)
    else:
        print("\n*** DRY RUN COMPLETE — no changes were made ***")

    print("\nDone! Restart your local backend to see the changes.")


if __name__ == "__main__":
    main()
