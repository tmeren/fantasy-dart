"""Gap Analysis Batch 1: Rounds 1-7 — Challonge vs Railway DB.

Compares Challonge screenshot data (source of truth) against Railway production DB.
Identifies discrepancies and generates SQL correction statements.
"""

import httpx

BASE = "https://backend-production-19be.up.railway.app"
ADMIN_EMAIL = "tmeren@gmail.com"

# Challonge data extracted from screenshot (Rounds 1-7, 70 matches)
# Format: (round, player1, score1, player2, score2, winner)
CHALLONGE = [
    # Round 1
    (1, "Ali Celik", 3, "Erkut Yaltkaya", 1, "Ali Celik"),
    (1, "Nurten Yilmaz", 3, "Ata Kemal Yukselen", 2, "Nurten Yilmaz"),
    (1, "Seckin Civan", 3, "Ece Saritepe", 1, "Seckin Civan"),
    (1, "Baran Yildiz", 0, "Muzaffer Akin", 3, "Muzaffer Akin"),
    (1, "Mehmet Ovali", 0, "Alican Donerkaya", 3, "Alican Donerkaya"),
    (1, "Okan Duman", 0, "Berkay Alpagot", 3, "Berkay Alpagot"),
    (1, "Busra Caliskan", 3, "Yusuf Cura", 2, "Busra Caliskan"),
    (1, "Havva Ozkan", 0, "Yasar Ulucan", 3, "Yasar Ulucan"),
    (1, "Emre Ozorhan", 3, "Selda Yesiltas", 1, "Emre Ozorhan"),
    (1, "Veli Metli", 0, "Ekin Isik", 3, "Ekin Isik"),
    # Round 2
    (2, "Yusuf Cura", 3, "Havva Ozkan", 0, "Yusuf Cura"),
    (2, "Yasar Ulucan", 2, "Ali Celik", 3, "Ali Celik"),
    (2, "Berkay Alpagot", 3, "Busra Caliskan", 2, "Berkay Alpagot"),
    (2, "Alican Donerkaya", 3, "Okan Duman", 0, "Alican Donerkaya"),
    (2, "Ekin Isik", 3, "Mehmet Ovali", 0, "Ekin Isik"),
    (2, "Selda Yesiltas", 3, "Veli Metli", 0, "Selda Yesiltas"),
    (2, "Muzaffer Akin", 2, "Emre Ozorhan", 3, "Emre Ozorhan"),
    (2, "Ece Saritepe", 3, "Baran Yildiz", 1, "Ece Saritepe"),
    (2, "Ata Kemal Yukselen", 0, "Seckin Civan", 3, "Seckin Civan"),
    (2, "Erkut Yaltkaya", 3, "Nurten Yilmaz", 2, "Erkut Yaltkaya"),
    # Round 3
    (3, "Baran Yildiz", 3, "Ata Kemal Yukselen", 2, "Baran Yildiz"),
    (3, "Seckin Civan", 0, "Erkut Yaltkaya", 3, "Erkut Yaltkaya"),
    (3, "Ali Celik", 1, "Nurten Yilmaz", 3, "Nurten Yilmaz"),
    (3, "Emre Ozorhan", 3, "Ece Saritepe", 2, "Emre Ozorhan"),
    (3, "Veli Metli", 0, "Muzaffer Akin", 3, "Muzaffer Akin"),
    (3, "Mehmet Ovali", 0, "Selda Yesiltas", 3, "Selda Yesiltas"),
    (3, "Okan Duman", 0, "Ekin Isik", 3, "Ekin Isik"),
    (3, "Busra Caliskan", 0, "Alican Donerkaya", 3, "Alican Donerkaya"),
    (3, "Havva Ozkan", 0, "Berkay Alpagot", 3, "Berkay Alpagot"),
    (3, "Yasar Ulucan", 3, "Yusuf Cura", 0, "Yasar Ulucan"),
    # Round 4
    (4, "Ekin Isik", 3, "Busra Caliskan", 1, "Ekin Isik"),
    (4, "Berkay Alpagot", 3, "Yasar Ulucan", 2, "Berkay Alpagot"),
    (4, "Alican Donerkaya", 3, "Havva Ozkan", 0, "Alican Donerkaya"),
    (4, "Yusuf Cura", 1, "Ali Celik", 3, "Ali Celik"),
    (4, "Selda Yesiltas", 3, "Okan Duman", 0, "Selda Yesiltas"),
    (4, "Muzaffer Akin", 3, "Mehmet Ovali", 0, "Muzaffer Akin"),
    (4, "Ece Saritepe", 3, "Veli Metli", 0, "Ece Saritepe"),
    (4, "Ata Kemal Yukselen", 1, "Emre Ozorhan", 3, "Emre Ozorhan"),
    (4, "Erkut Yaltkaya", 3, "Baran Yildiz", 0, "Erkut Yaltkaya"),
    (4, "Nurten Yilmaz", 0, "Seckin Civan", 3, "Seckin Civan"),
    # Round 5
    (5, "Mehmet Ovali", 0, "Ece Saritepe", 3, "Ece Saritepe"),
    (5, "Baran Yildiz", 0, "Nurten Yilmaz", 3, "Nurten Yilmaz"),
    (5, "Emre Ozorhan", 1, "Erkut Yaltkaya", 3, "Erkut Yaltkaya"),
    (5, "Veli Metli", 0, "Ata Kemal Yukselen", 3, "Ata Kemal Yukselen"),
    (5, "Ali Celik", 0, "Seckin Civan", 3, "Seckin Civan"),
    (5, "Okan Duman", 0, "Muzaffer Akin", 3, "Muzaffer Akin"),
    (5, "Busra Caliskan", 1, "Selda Yesiltas", 3, "Selda Yesiltas"),
    (5, "Havva Ozkan", 3, "Ekin Isik", 0, "Havva Ozkan"),
    (5, "Yasar Ulucan", 1, "Alican Donerkaya", 3, "Alican Donerkaya"),
    (5, "Yusuf Cura", 3, "Berkay Alpagot", 0, "Yusuf Cura"),
    # Round 6
    (6, "Ece Saritepe", 3, "Okan Duman", 0, "Ece Saritepe"),
    (6, "Alican Donerkaya", 3, "Yusuf Cura", 1, "Alican Donerkaya"),
    (6, "Ekin Isik", 0, "Yasar Ulucan", 3, "Yasar Ulucan"),
    (6, "Selda Yesiltas", 3, "Havva Ozkan", 1, "Selda Yesiltas"),
    (6, "Muzaffer Akin", 3, "Busra Caliskan", 2, "Muzaffer Akin"),
    (6, "Berkay Alpagot", 3, "Ali Celik", 1, "Berkay Alpagot"),
    (6, "Ata Kemal Yukselen", 3, "Mehmet Ovali", 0, "Ata Kemal Yukselen"),
    (6, "Erkut Yaltkaya", 3, "Veli Metli", 0, "Erkut Yaltkaya"),
    (6, "Nurten Yilmaz", 1, "Emre Ozorhan", 3, "Emre Ozorhan"),
    (6, "Seckin Civan", 3, "Baran Yildiz", 0, "Seckin Civan"),
    # Round 7
    (7, "Havva Ozkan", 1, "Muzaffer Akin", 3, "Muzaffer Akin"),
    (7, "Emre Ozorhan", 2, "Seckin Civan", 3, "Seckin Civan"),
    (7, "Veli Metli", 0, "Nurten Yilmaz", 3, "Nurten Yilmaz"),
    (7, "Mehmet Ovali", 0, "Erkut Yaltkaya", 3, "Erkut Yaltkaya"),
    (7, "Okan Duman", 0, "Ata Kemal Yukselen", 3, "Ata Kemal Yukselen"),
    (7, "Busra Caliskan", 3, "Ece Saritepe", 2, "Busra Caliskan"),
    (7, "Ali Celik", 0, "Baran Yildiz", 3, "Baran Yildiz"),
    (7, "Yasar Ulucan", 3, "Selda Yesiltas", 2, "Yasar Ulucan"),
    (7, "Yusuf Cura", 1, "Ekin Isik", 3, "Ekin Isik"),
    (7, "Berkay Alpagot", 3, "Alican Donerkaya", 0, "Berkay Alpagot"),
]


def make_key(p1, p2):
    """Create a canonical key from two player names (sorted)."""
    return tuple(sorted([p1, p2]))


def main():
    client = httpx.Client(base_url=BASE, timeout=30)

    # Authenticate
    resp = client.post("/api/auth/login", json={"email": ADMIN_EMAIL})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch all completed results from Railway
    results = client.get("/api/tournament/results", headers=headers).json()

    # Index Railway matches by (round, player-pair-key)
    railway = {}
    for m in results:
        if m["round"] <= 7:
            key = (m["round"], make_key(m["player1"], m["player2"]))
            railway[key] = m

    print("=" * 80)
    print("GAP ANALYSIS — BATCH 1: Rounds 1-7")
    print("Challonge (source of truth) vs Railway DB (current)")
    print("=" * 80)

    discrepancies = []
    matches_checked = 0

    for rnd, p1, s1, p2, s2, winner in CHALLONGE:
        matches_checked += 1
        key = (rnd, make_key(p1, p2))
        db = railway.get(key)

        if not db:
            print(f"  WARNING: R{rnd} {p1} vs {p2} — NOT FOUND in Railway DB")
            continue

        mid = db["match_id"]

        # Normalize: Challonge player order might differ from Railway
        # Match by actual player positions in Railway
        if db["player1"] == p1 and db["player2"] == p2:
            db_s1, db_s2, db_winner = db["score1"], db["score2"], db["winner"]
        elif db["player1"] == p2 and db["player2"] == p1:
            # Players are swapped in Railway
            db_s1, db_s2, db_winner = db["score2"], db["score1"], db["winner"]
        else:
            print(
                f"  WARNING: R{rnd} M{mid} player mismatch: "
                f"Challonge={p1}/{p2}, Railway={db['player1']}/{db['player2']}"
            )
            continue

        # Compare
        score_match = s1 == db_s1 and s2 == db_s2
        winner_match = winner == db_winner

        if not score_match or not winner_match:
            disc = {
                "match_id": mid,
                "round": rnd,
                "player1": db["player1"],
                "player2": db["player2"],
                "challonge_s1": s1 if db["player1"] == p1 else s2,
                "challonge_s2": s2 if db["player1"] == p1 else s1,
                "challonge_winner": winner,
                "railway_s1": db["score1"],
                "railway_s2": db["score2"],
                "railway_winner": db["winner"],
                "is_draw": db.get("is_draw", False),
            }
            discrepancies.append(disc)

    print(f"\nMatches checked: {matches_checked}")
    print(f"Discrepancies found: {len(discrepancies)}")

    if discrepancies:
        print(f"\n{'='*80}")
        print("DISCREPANCIES")
        print(f"{'='*80}")
        print(
            f"\n{'M#':<6} {'Round':<6} {'Player 1':<22} {'Player 2':<22} {'Challonge':<14} {'Railway':<14} {'Fix'}"
        )
        print("-" * 110)

        sql_statements = []

        for d in discrepancies:
            ch_score = f"{d['challonge_s1']}-{d['challonge_s2']}"
            rw_score = f"{d['railway_s1']}-{d['railway_s2']}"
            ch_win = d["challonge_winner"]
            rw_win = d["railway_winner"]

            # Determine if this is a draw (0-0 forfeit)
            if d["challonge_s1"] == 0 and d["challonge_s2"] == 0:
                fix = "→ 0-0 draw (forfeit)"
                sql = (
                    f"UPDATE matches SET score1=0, score2=0, "
                    f"winner=NULL, is_draw=true "
                    f"WHERE match_id={d['match_id']};"
                )
            else:
                fix = f"→ {ch_score} {ch_win}"
                winner_esc = ch_win.replace("'", "''")
                sql = (
                    f"UPDATE matches SET score1={d['challonge_s1']}, "
                    f"score2={d['challonge_s2']}, "
                    f"winner='{winner_esc}', is_draw=false "
                    f"WHERE match_id={d['match_id']};"
                )

            sql_statements.append(sql)

            print(
                f"M{d['match_id']:<5} R{d['round']:<5} {d['player1']:<22} "
                f"{d['player2']:<22} {ch_score:<6} {ch_win:<7} "
                f"{rw_score:<6} {rw_win:<7} {fix}"
            )

        print(f"\n{'='*80}")
        print("SQL CORRECTION STATEMENTS (run on Railway PostgreSQL)")
        print(f"{'='*80}")
        print("-- Batch 1: Rounds 1-7 corrections")
        print("-- Generated from Challonge screenshot comparison")
        print(f"-- {len(sql_statements)} statements\n")
        print("BEGIN;")
        for sql in sql_statements:
            print(f"  {sql}")
        print("COMMIT;")
        print()
        print("-- After running SQL, trigger full Elo recalc via:")
        print("-- POST /api/admin/recalculate-elo (with admin Bearer token)")

    else:
        print("\n✓ All matches in Rounds 1-7 match perfectly!")

    client.close()


if __name__ == "__main__":
    main()
