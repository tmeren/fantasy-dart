"""
Fantasy Darts Betting API

A fun fantasy betting platform for friends - NO REAL MONEY.
Tokens have no cash value.
"""

import os

from database import Activity, WhatsAppLog, create_tables, get_db, migrate_add_columns
from deps import manager
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from match_data import seed_matches_from_csv
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from routes.bets import router as bets_router
from routes.leaderboard import router as leaderboard_router
from routes.markets import router as markets_router
from routes.tournament import router as tournament_router
from schemas import ActivityResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from whatsapp_client import whatsapp_client

# ============================================================================
# Configuration
# ============================================================================

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# ============================================================================
# App Setup
# ============================================================================

app = FastAPI(
    title="Fantasy Darts Betting",
    description="""
    ## A Fun Fantasy Betting Platform for Friends

    **IMPORTANT DISCLAIMERS:**
    - This is NOT real gambling
    - Tokens have NO cash value
    - For entertainment purposes only
    - No real money is exchanged
    - Must be 18+ to participate
    """,
    version="2.0.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — clean JSON 500s instead of raw tracebacks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ============================================================================
# Include Routers
# ============================================================================

app.include_router(auth_router)
app.include_router(markets_router)
app.include_router(bets_router)
app.include_router(leaderboard_router)
app.include_router(tournament_router)
app.include_router(admin_router)

# ============================================================================
# Startup
# ============================================================================


@app.on_event("startup")
async def startup():
    create_tables()
    migrate_add_columns()
    seed_matches_from_csv()
    _seed_qf_markets_if_needed()
    _backfill_betslip_ids()
    _prewarm_outright_cache()


def _seed_qf_markets_if_needed():
    """Create QF match markets if the playoff bracket exists but no open match markets do."""
    from database import BettingType, Market, MarketStatus, Selection, SessionLocal
    from elo_engine import get_elo_ratings
    from match_data import get_standings

    db = SessionLocal()
    try:
        # Only proceed if there are NO open or closed match markets
        open_match = (
            db.query(Market)
            .filter(
                Market.market_type == "match",
                Market.status.in_([MarketStatus.OPEN, MarketStatus.CLOSED]),
            )
            .first()
        )
        if open_match:
            return  # QF markets already exist

        ratings = get_elo_ratings()
        standings = get_standings()
        current_top8 = [s["player"] for s in standings[:8]]
        if len(current_top8) < 8:
            return  # Not enough players for QF bracket

        from odds_engine import get_quarterfinal_matchup_odds

        qf_odds = get_quarterfinal_matchup_odds(ratings, current_top8)
        if not qf_odds:
            return

        created = 0
        for qf in qf_odds:
            parts_h = qf["higher_seed"].split()
            parts_l = qf["lower_seed"].split()
            short_h = parts_h[0] if len(parts_h) > 1 else qf["higher_seed"]
            short_l = parts_l[0] if len(parts_l) > 1 else qf["lower_seed"]
            seed_h = current_top8.index(qf["higher_seed"]) + 1
            seed_l = current_top8.index(qf["lower_seed"]) + 1

            market = Market(
                name=f"{qf['label']}: #{seed_h} {short_h} vs #{seed_l} {short_l}",
                description="Quarterfinal match winner. Pool betting — odds change with bets.",
                market_type="match",
                betting_type=BettingType.PARIMUTUEL,
                house_cut=0.10,
            )
            db.add(market)
            db.flush()

            db.add(
                Selection(
                    market_id=market.id,
                    name=qf["higher_seed"],
                    odds=qf["odds_higher"],
                    pool_total=0.0,
                )
            )
            db.add(
                Selection(
                    market_id=market.id,
                    name=qf["lower_seed"],
                    odds=qf["odds_lower"],
                    pool_total=0.0,
                )
            )
            created += 1

        db.commit()
        if created:
            print(f"[startup] Created {created} QF match markets")
    except Exception as e:
        print(f"[startup] QF market seed error: {e}")
        db.rollback()
    finally:
        db.close()


def _backfill_betslip_ids():
    """Retroactively assign betslip_ids to bets placed together.

    Phase 1: Clear invalid betslips (duplicate markets — e.g. two outright picks
             or 8 QF bets wrongly lumped together).
    Phase 2: Re-group orphan bets by user + 60s window, then split sub-groups
             so each betslip has at most one pick per market.
    """
    import uuid
    from datetime import timedelta

    from database import Bet, SessionLocal

    db = SessionLocal()
    try:
        # ── Phase 1: fix existing invalid betslips ──────────────────────
        existing_ids = [
            r[0]
            for r in db.query(Bet.betslip_id).filter(Bet.betslip_id.isnot(None)).distinct().all()
        ]
        cleared = 0
        for bsid in existing_ids:
            legs = db.query(Bet).filter(Bet.betslip_id == bsid).all()
            seen_markets: set[int] = set()
            has_dup = False
            for leg in legs:
                mid = leg.selection.market_id if leg.selection else -1
                if mid in seen_markets:
                    has_dup = True
                    break
                seen_markets.add(mid)
            if has_dup:
                for leg in legs:
                    leg.betslip_id = None
                    cleared += 1
        if cleared:
            db.flush()
            print(f"[startup] Cleared {cleared} bets from invalid betslips (duplicate markets)")

        # ── Phase 2: assign betslip_ids to orphan bets ──────────────────
        orphan_bets = (
            db.query(Bet)
            .filter(Bet.betslip_id.is_(None))
            .order_by(Bet.user_id, Bet.created_at)
            .all()
        )
        if not orphan_bets:
            if cleared:
                db.commit()
            return

        # Group by user + 60-second window
        time_groups: list[list[Bet]] = []
        current_group: list[Bet] = []
        for bet in orphan_bets:
            if not current_group:
                current_group = [bet]
            elif bet.user_id == current_group[-1].user_id and (
                bet.created_at - current_group[-1].created_at
            ) < timedelta(seconds=60):
                current_group.append(bet)
            else:
                time_groups.append(current_group)
                current_group = [bet]
        if current_group:
            time_groups.append(current_group)

        # Split each time-group into sub-groups with unique markets.
        # A real betslip can never have two picks from the same market.
        updated = 0
        betslips_created = 0
        for group in time_groups:
            subgroups: list[list[Bet]] = []
            cur: list[Bet] = []
            seen: set[int] = set()
            for bet in group:
                mid = bet.selection.market_id if bet.selection else -1
                if mid in seen:
                    # Duplicate market → start a new sub-group
                    subgroups.append(cur)
                    cur = [bet]
                    seen = {mid}
                else:
                    cur.append(bet)
                    seen.add(mid)
            if cur:
                subgroups.append(cur)

            for sg in subgroups:
                if len(sg) >= 2:
                    betslip_id = str(uuid.uuid4())
                    for bet in sg:
                        bet.betslip_id = betslip_id
                        updated += 1
                    betslips_created += 1

        if updated or cleared:
            db.commit()
        if updated:
            print(f"[startup] Backfilled {updated} bets into {betslips_created} betslips")
    except Exception as e:
        print(f"[startup] Betslip backfill error: {e}")
        db.rollback()
    finally:
        db.close()


def _prewarm_outright_cache():
    """Pre-warm the MC outright odds cache so first request is instant."""
    from elo_engine import get_elo_ratings
    from match_data import get_scheduled_matches
    from routes.tournament import _get_cached_outright

    ratings = get_elo_ratings()
    sched = get_scheduled_matches()
    _get_cached_outright(ratings, sched)


# ============================================================================
# Activity Feed (kept in main — lightweight, no dedicated module needed)
# ============================================================================


@app.get("/api/activities", response_model=list[ActivityResponse], tags=["activity"])
async def get_activities(limit: int = 500, db: Session = Depends(get_db)):
    """Get activity feed (all activities since start)."""
    activities = db.query(Activity).order_by(Activity.created_at.desc()).limit(limit).all()
    return activities


# ============================================================================
# WebSocket for Live Updates
# ============================================================================


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ============================================================================
# WhatsApp Webhooks (kept in main — need raw Request access)
# ============================================================================


@app.get("/api/webhooks/whatsapp", tags=["webhooks"])
async def whatsapp_webhook_verify(request: Request):
    """WhatsApp webhook verification (GET). Returns hub.challenge if token matches."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == whatsapp_client.verify_token:
        return PlainTextResponse(content=challenge or "")

    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/api/webhooks/whatsapp", tags=["webhooks"])
async def whatsapp_webhook_incoming(request: Request, db: Session = Depends(get_db)):
    """Handle incoming WhatsApp webhook events (message status updates)."""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    if not whatsapp_client.verify_webhook_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for status_update in value.get("statuses", []):
                meta_id = status_update.get("id")
                new_status = status_update.get("status", "")
                if meta_id:
                    log = (
                        db.query(WhatsAppLog).filter(WhatsAppLog.meta_message_id == meta_id).first()
                    )
                    if log:
                        log.status = new_status

    db.commit()
    return {"status": "ok"}


# ============================================================================
# Health Check
# ============================================================================


@app.get("/api/health", tags=["health"])
async def health(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "version": "2.0.0",
    }


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
