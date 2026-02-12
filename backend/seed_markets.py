"""Seed the database with Elo-derived darts betting markets.

Uses the Elo engine and odds engine to generate calibrated odds
instead of hardcoded values. All markets use parimutuel betting
with 10% house cut.
"""

from database import BettingType, Market, Selection, SessionLocal, User, create_tables
from elo_engine import get_elo_ratings, get_sorted_ratings
from match_data import scheduled_matches
from odds_engine import get_match_odds, get_outright_odds, get_quarterfinal_matchup_odds


def seed_database():
    """Create initial markets with Elo-derived odds."""
    create_tables()
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Market).count() > 0:
            print("Database already seeded. Skipping.")
            return

        # --- Compute odds from engines ---
        print("Computing Elo ratings...")
        ratings = get_elo_ratings()
        sched = scheduled_matches()

        print("Running Monte Carlo simulation for outright odds...")
        outright = get_outright_odds(ratings, sched)

        print("Computing match odds...")
        match_odds_list = get_match_odds(ratings, sched)

        # Get current top 8 for QF bracket
        sorted_ratings = get_sorted_ratings(ratings)
        current_top8 = [name for name, _ in sorted_ratings[:8]]

        print("Computing quarterfinal odds...")
        qf_odds = get_quarterfinal_matchup_odds(ratings, current_top8)

        # --- Create admin user ---
        admin = User(
            email="tmeren@gmail.com",
            name="Bookmaker",
            balance=10000.0,
            is_admin=True,
        )
        db.add(admin)
        db.flush()
        print(f"Created admin user: {admin.email}")

        # --- 1. Tournament Winner (Outright) Market ---
        champ_market = Market(
            name="Tournament Winner",
            description=(
                "Who will win the Darts Championship? "
                "Pool betting — odds change with bets. 10% house cut. "
                "Odds derived from Elo ratings + Monte Carlo simulation."
            ),
            market_type="outright",
            betting_type=BettingType.PARIMUTUEL,
            house_cut=0.10,
        )
        db.add(champ_market)
        db.flush()

        for o in outright:
            sel = Selection(
                market_id=champ_market.id,
                name=o["player"],
                odds=o["odds"],
                pool_total=0.0,
            )
            db.add(sel)

        print(f"Created market: {champ_market.name} " f"({len(outright)} selections, PARIMUTUEL)")

        # --- 2. Quarterfinal Markets ---
        for i, qf in enumerate(qf_odds):
            seed_h = current_top8.index(qf["higher_seed"]) + 1
            seed_l = current_top8.index(qf["lower_seed"]) + 1

            market = Market(
                name=f"{qf['label']}: #{seed_h} {qf['higher_seed']} vs "
                f"#{seed_l} {qf['lower_seed']}",
                description=(
                    "Quarterfinal match winner. "
                    "Pool betting — odds change with bets. "
                    "Knockout adjustments applied (shrinkage, fatigue)."
                ),
                market_type="match",
                betting_type=BettingType.PARIMUTUEL,
                house_cut=0.10,
            )
            db.add(market)
            db.flush()

            sel_h = Selection(
                market_id=market.id,
                name=qf["higher_seed"],
                odds=qf["odds_higher"],
                pool_total=0.0,
            )
            sel_l = Selection(
                market_id=market.id,
                name=qf["lower_seed"],
                odds=qf["odds_lower"],
                pool_total=0.0,
            )
            db.add(sel_h)
            db.add(sel_l)

            print(f"Created market: {market.name} (PARIMUTUEL)")

        # --- 3. Upcoming Round-Robin Match Markets (next 10 scheduled) ---
        for mo in match_odds_list[:10]:
            market = Market(
                name=f"R{mo['round']} M{mo['match_id']}: " f"{mo['player1']} vs {mo['player2']}",
                description=(
                    f"Round {mo['round']} match winner. "
                    f"Elo: {mo['elo1']} vs {mo['elo2']}. "
                    "Pool betting — odds change with bets."
                ),
                market_type="match",
                betting_type=BettingType.PARIMUTUEL,
                house_cut=0.10,
            )
            db.add(market)
            db.flush()

            sel1 = Selection(
                market_id=market.id,
                name=mo["player1"],
                odds=mo["odds1"],
                pool_total=0.0,
            )
            sel2 = Selection(
                market_id=market.id,
                name=mo["player2"],
                odds=mo["odds2"],
                pool_total=0.0,
            )
            db.add(sel1)
            db.add(sel2)

            print(f"Created market: {market.name} (PARIMUTUEL)")

        db.commit()

        total_markets = db.query(Market).count()
        total_selections = db.query(Selection).count()
        print("\nDatabase seeded successfully!")
        print(f"Total markets: {total_markets}")
        print(f"Total selections: {total_selections}")
        print("\nMarket breakdown:")
        print(f"  1 Outright (Tournament Winner) — {len(outright)} selections")
        print("  4 Quarterfinal matches — 8 selections")
        print(
            f"  {min(10, len(match_odds_list))} Round-robin matches — "
            f"{min(10, len(match_odds_list)) * 2} selections"
        )

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
