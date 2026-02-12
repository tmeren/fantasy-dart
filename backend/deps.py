"""Shared dependencies — auth helpers, constants, utility functions.

Extracted from main.py to avoid circular imports between route modules.
"""

import json
import os
import secrets
from datetime import datetime, timedelta

from database import (
    Activity,
    BettingType,
    Market,
    Selection,
    User,
    get_db,
)
from fastapi import Depends, WebSocket
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from schemas import SelectionResponse
from sqlalchemy.orm import Session

# ============================================================================
# Configuration
# ============================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-" + secrets.token_hex(16))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
MAGIC_LINK_EXPIRE_MINUTES = 15
STARTING_BALANCE = 1000.0

# Parimutuel-Elo blending threshold
BLEND_THRESHOLD = 500.0

# Security
security = HTTPBearer(auto_error=False)


# ============================================================================
# WebSocket Manager
# ============================================================================


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


# ============================================================================
# Auth Helpers
# ============================================================================


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except (JWTError, ValueError):
        return None


def require_user(user: User | None = Depends(get_current_user)) -> User:
    if not user:
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if not user.is_admin:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ============================================================================
# Activity Logging
# ============================================================================


async def log_activity(
    db: Session, activity_type: str, message: str, user_id: int = None, data: dict = None
):
    """Log an activity and broadcast to WebSocket clients."""
    activity = Activity(
        activity_type=activity_type,
        user_id=user_id,
        message=message,
        data=json.dumps(data) if data else None,
    )
    db.add(activity)
    db.commit()

    await manager.broadcast(
        {
            "type": activity_type,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# ============================================================================
# Market Helpers
# ============================================================================


def calculate_parimutuel_odds(market: Market, db: Session) -> dict:
    """Calculate dynamic odds for parimutuel betting with Elo-seeded blending."""
    total_pool = sum(s.pool_total for s in market.selections)
    house_cut = market.house_cut or 0.10
    pool_after_cut = total_pool * (1 - house_cut)

    blend = min(1.0, 0.2 + 0.8 * (total_pool / BLEND_THRESHOLD)) if total_pool > 0 else 0.0

    result = {}
    for sel in market.selections:
        elo_odds = sel.odds if sel.odds and sel.odds > 1.0 else 2.0

        if sel.pool_total > 0 and total_pool > 0:
            pool_odds = pool_after_cut / sel.pool_total
            pool_pct = sel.pool_total / total_pool * 100
        else:
            pool_odds = elo_odds
            pool_pct = 0

        blended_odds = (1 - blend) * elo_odds + blend * pool_odds

        result[sel.id] = {
            "odds": round(max(blended_odds, 1.01), 2),
            "pool_total": sel.pool_total,
            "pool_pct": round(pool_pct, 1),
            "elo_odds": round(elo_odds, 2),
            "blend_factor": round(blend, 2),
        }

    return result


def build_selection_response(
    sel: Selection, market: Market, parimutuel_data: dict = None
) -> SelectionResponse:
    """Build a SelectionResponse with dynamic odds if parimutuel."""
    if market.betting_type == BettingType.PARIMUTUEL and parimutuel_data:
        data = parimutuel_data.get(sel.id, {})
        return SelectionResponse(
            id=sel.id,
            name=sel.name,
            odds=sel.odds,
            pool_total=data.get("pool_total", 0),
            pool_percentage=data.get("pool_pct", 0),
            dynamic_odds=data.get("odds", sel.odds),
            is_winner=sel.is_winner,
        )
    else:
        return SelectionResponse(
            id=sel.id,
            name=sel.name,
            odds=sel.odds,
            pool_total=sel.pool_total,
            pool_percentage=0,
            dynamic_odds=sel.odds,
            is_winner=sel.is_winner,
        )
