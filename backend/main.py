"""
Fantasy Darts Betting API

A fun fantasy betting platform for friends - NO REAL MONEY.
Tokens have no cash value.
"""

import json
import os
import secrets
from datetime import datetime, timedelta

from database import (
    Activity,
    Bet,
    BetStatus,
    BettingType,
    Market,
    MarketStatus,
    Selection,
    User,
    create_tables,
    get_db,
)
from elo_engine import get_elo_ratings, get_sorted_ratings
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

# Tournament engine imports
from match_data import (
    completed_matches,
    get_scheduled_matches,
    get_standings,
    invalidate_cache,
    seed_matches_from_csv,
    write_match_result,
)
from odds_engine import get_outright_odds
from schemas import (
    ActivityResponse,
    BalanceHistoryEntry,
    BetCreate,
    BetPublic,
    BetResponse,
    CompletedMatchResponse,
    EnterResultRequest,
    EnterResultResponse,
    LeaderboardEntry,
    LiabilityMarket,
    LiabilitySelection,
    MagicLinkRequest,
    MagicLinkVerify,
    MarketCreate,
    MarketResponse,
    MarketSettle,
    OutrightOddsEntry,
    PlayerRatingResponse,
    ScheduledMatchResponse,
    SelectionResponse,
    StandingEntry,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPublic,
    UserResponse,
)
from sqlalchemy import case, func, text
from sqlalchemy.orm import Session

# ============================================================================
# Configuration
# ============================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-" + secrets.token_hex(16))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
MAGIC_LINK_EXPIRE_MINUTES = 15
STARTING_BALANCE = 100.0

# Email config (Resend)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")

# CORS origins — comma-separated in production, permissive in dev
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
    version="1.0.0",
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


# Security
security = HTTPBearer(auto_error=False)


# WebSocket connections for live updates
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
# Startup
# ============================================================================


@app.on_event("startup")
async def startup():
    create_tables()
    seed_matches_from_csv()


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
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


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

    # Broadcast to all connected clients
    await manager.broadcast(
        {
            "type": activity_type,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# Parimutuel-Elo blending threshold (tokens in pool before full parimutuel)
BLEND_THRESHOLD = 500.0


def calculate_parimutuel_odds(market: Market, db: Session) -> dict:
    """
    Calculate dynamic odds for parimutuel betting with Elo-seeded blending.

    Returns dict of {selection_id: {"odds": float, "pool_total": float,
                     "pool_pct": float, "elo_odds": float, "blend_factor": float}}

    Blending formula:
    - blend starts at 0.2 (small pool, mostly Elo) → 1.0 (large pool, full parimutuel)
    - displayed_odds = (1 - blend) * elo_odds + blend * pool_odds
    """
    total_pool = sum(s.pool_total for s in market.selections)
    house_cut = market.house_cut or 0.10
    pool_after_cut = total_pool * (1 - house_cut)

    # Blending factor: 0.2 at zero pool → 1.0 at BLEND_THRESHOLD
    blend = min(1.0, 0.2 + 0.8 * (total_pool / BLEND_THRESHOLD)) if total_pool > 0 else 0.0

    result = {}
    for sel in market.selections:
        # Elo-derived initial odds (set at market creation)
        elo_odds = sel.odds if sel.odds and sel.odds > 1.0 else 2.0

        if sel.pool_total > 0 and total_pool > 0:
            pool_odds = pool_after_cut / sel.pool_total
            pool_pct = sel.pool_total / total_pool * 100
        else:
            pool_odds = elo_odds
            pool_pct = 0

        # Blended odds
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
            odds=sel.odds,  # Original/initial odds
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


# ============================================================================
# Auth Routes
# ============================================================================


@app.post("/api/auth/register", response_model=TokenResponse)
async def register(data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and name. Gets 100 tokens to start."""
    # Check if email exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=data.email,
        name=data.name,
        balance=STARTING_BALANCE,
        is_admin=db.query(User).count() == 0,  # First user is admin
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log activity
    await log_activity(
        db,
        "user_joined",
        f"{user.name} joined the game!",
        user_id=user.id,
        data={"user_name": user.name},
    )

    # Return token
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email. In production, use magic link."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@app.post("/api/auth/magic-link")
async def request_magic_link(data: MagicLinkRequest, db: Session = Depends(get_db)):
    """Request a magic link login (sends email)."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Don't reveal if user exists
        return {"message": "If this email is registered, you will receive a login link."}

    # Generate magic token
    token = secrets.token_urlsafe(32)
    user.magic_token = token
    user.magic_token_expires = datetime.utcnow() + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)
    db.commit()

    # Send email (if configured)
    if RESEND_API_KEY:
        import resend

        resend.api_key = RESEND_API_KEY

        resend.Emails.send(
            {
                "from": "Darts Betting <noreply@yourdomain.com>",
                "to": [user.email],
                "subject": "Your Login Link - Fantasy Darts Betting",
                "html": f"""
                <h2>Login to Fantasy Darts Betting</h2>
                <p>Click the link below to log in:</p>
                <a href="{APP_URL}/auth/verify?token={token}">Login Now</a>
                <p>This link expires in {MAGIC_LINK_EXPIRE_MINUTES} minutes.</p>
                <hr>
                <small>This is a fantasy game with no real money. Tokens have no cash value.</small>
            """,
            }
        )

    return {
        "message": "If this email is registered, you will receive a login link.",
        "debug_token": token if not RESEND_API_KEY else None,
    }


@app.post("/api/auth/verify-magic-link", response_model=TokenResponse)
async def verify_magic_link(data: MagicLinkVerify, db: Session = Depends(get_db)):
    """Verify magic link token and return JWT."""
    user = (
        db.query(User)
        .filter(User.magic_token == data.token, User.magic_token_expires > datetime.utcnow())
        .first()
    )

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Clear magic token
    user.magic_token = None
    user.magic_token_expires = None
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_user)):
    """Get current user info."""
    return user


# ============================================================================
# Market Routes
# ============================================================================


@app.get("/api/markets", response_model=list[MarketResponse])
async def list_markets(status: MarketStatus | None = None, db: Session = Depends(get_db)):
    """List all markets, optionally filtered by status."""
    query = db.query(Market)
    if status:
        query = query.filter(Market.status == status)
    markets = query.order_by(Market.created_at.desc()).all()

    result = []
    for market in markets:
        total_staked = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_staked * (1 - house_cut)

        # Calculate dynamic odds for parimutuel markets
        parimutuel_data = None
        if market.betting_type == BettingType.PARIMUTUEL:
            parimutuel_data = calculate_parimutuel_odds(market, db)

        selections = [
            build_selection_response(s, market, parimutuel_data) for s in market.selections
        ]

        market_dict = MarketResponse(
            id=market.id,
            name=market.name,
            description=market.description,
            market_type=market.market_type,
            betting_type=market.betting_type,
            house_cut=market.house_cut,
            status=market.status,
            created_at=market.created_at,
            closes_at=market.closes_at,
            selections=selections,
            total_staked=total_staked,
            pool_after_cut=pool_after_cut,
        )
        result.append(market_dict)

    return result


@app.get("/api/markets/{market_id}", response_model=MarketResponse)
async def get_market(market_id: int, db: Session = Depends(get_db)):
    """Get a specific market."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    total_staked = sum(s.pool_total for s in market.selections)
    house_cut = market.house_cut or 0.10
    pool_after_cut = total_staked * (1 - house_cut)

    # Calculate dynamic odds for parimutuel markets
    parimutuel_data = None
    if market.betting_type == BettingType.PARIMUTUEL:
        parimutuel_data = calculate_parimutuel_odds(market, db)

    selections = [build_selection_response(s, market, parimutuel_data) for s in market.selections]

    return MarketResponse(
        id=market.id,
        name=market.name,
        description=market.description,
        market_type=market.market_type,
        betting_type=market.betting_type,
        house_cut=market.house_cut,
        status=market.status,
        created_at=market.created_at,
        closes_at=market.closes_at,
        selections=selections,
        total_staked=total_staked,
        pool_after_cut=pool_after_cut,
    )


@app.post("/api/markets", response_model=MarketResponse)
async def create_market(
    data: MarketCreate, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Create a new betting market (admin only)."""
    market = Market(
        name=data.name,
        description=data.description,
        market_type=data.market_type,
        betting_type=data.betting_type,
        house_cut=data.house_cut,
        closes_at=data.closes_at,
    )
    db.add(market)
    db.flush()

    for sel in data.selections:
        selection = Selection(market_id=market.id, name=sel.name, odds=sel.odds, pool_total=0.0)
        db.add(selection)

    db.commit()
    db.refresh(market)

    betting_type_str = (
        "Pool (dynamic odds)" if data.betting_type == BettingType.PARIMUTUEL else "Fixed odds"
    )
    await log_activity(
        db,
        "market_created",
        f"New market: {market.name} ({betting_type_str})",
        user_id=user.id,
        data={
            "market_id": market.id,
            "market_name": market.name,
            "betting_type": data.betting_type.value,
        },
    )

    return await get_market(market.id, db)


@app.put("/api/markets/{market_id}/close")
async def close_market(
    market_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Close a market (no more bets allowed)."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    market.status = MarketStatus.CLOSED
    db.commit()

    await log_activity(
        db, "market_closed", f"Market closed: {market.name}", data={"market_id": market.id}
    )

    return {"message": "Market closed"}


@app.put("/api/markets/{market_id}/settle")
async def settle_market(
    market_id: int,
    data: MarketSettle,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Settle a market with a winning selection."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    winning_selection = (
        db.query(Selection)
        .filter(Selection.id == data.winning_selection_id, Selection.market_id == market_id)
        .first()
    )
    if not winning_selection:
        raise HTTPException(status_code=400, detail="Invalid winning selection")

    # Mark winner
    winning_selection.is_winner = True
    market.status = MarketStatus.SETTLED
    market.settled_at = datetime.utcnow()

    # Settle all bets
    bets = (
        db.query(Bet)
        .filter(
            Bet.selection_id.in_([s.id for s in market.selections]), Bet.status == BetStatus.ACTIVE
        )
        .all()
    )

    winners = []
    total_payout = 0

    if market.betting_type == BettingType.PARIMUTUEL:
        # PARIMUTUEL: Calculate final payouts from pool
        total_pool = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_pool * (1 - house_cut)
        winning_pool = winning_selection.pool_total

        # Final odds for winners
        final_odds = pool_after_cut / winning_pool if winning_pool > 0 else 0

        for bet in bets:
            if bet.selection_id == winning_selection.id:
                # Winner - calculate actual payout from pool
                actual_payout = bet.stake * final_odds
                bet.status = BetStatus.WON
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = actual_payout
                bet.user.balance += actual_payout
                winners.append(bet)
                total_payout += actual_payout
            else:
                # Loser
                bet.status = BetStatus.LOST
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = 0

        # House profit
        house_profit = total_pool * house_cut

    else:
        # FIXED ODDS: Use locked odds at time of bet
        for bet in bets:
            if bet.selection_id == winning_selection.id:
                # Winner!
                bet.status = BetStatus.WON
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = bet.potential_win
                bet.user.balance += bet.potential_win
                winners.append(bet)
                total_payout += bet.potential_win
            else:
                # Loser
                bet.status = BetStatus.LOST
                bet.settled_at = datetime.utcnow()
                bet.actual_payout = 0

        house_profit = sum(s.pool_total for s in market.selections) - total_payout

    db.commit()

    payout_type = "pool" if market.betting_type == BettingType.PARIMUTUEL else "fixed"
    await log_activity(
        db,
        "market_settled",
        f"{market.name} settled! Winner: {winning_selection.name} ({payout_type} payout)",
        data={
            "market_id": market.id,
            "winner": winning_selection.name,
            "total_winners": len(winners),
            "total_payout": round(total_payout, 2),
            "house_profit": round(house_profit, 2),
            "betting_type": market.betting_type.value,
        },
    )

    return {
        "message": f"Market settled. {len(winners)} winning bets paid out.",
        "total_payout": round(total_payout, 2),
        "house_profit": round(house_profit, 2),
    }


# ============================================================================
# Bet Routes
# ============================================================================


@app.post("/api/bets", response_model=BetResponse)
async def place_bet(
    data: BetCreate, user: User = Depends(require_user), db: Session = Depends(get_db)
):
    """Place a bet on a selection."""
    # Validate stake
    if data.stake <= 0:
        raise HTTPException(status_code=400, detail="Stake must be positive")
    if data.stake > user.balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Get selection and market
    selection = db.query(Selection).filter(Selection.id == data.selection_id).first()
    if not selection:
        raise HTTPException(status_code=404, detail="Selection not found")

    market = selection.market
    if market.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open for betting")

    # Deduct stake
    user.balance -= data.stake

    # Update selection pool total
    selection.pool_total += data.stake
    db.flush()

    # Calculate odds for bet
    if market.betting_type == BettingType.PARIMUTUEL:
        # Calculate current dynamic odds after this bet
        parimutuel_data = calculate_parimutuel_odds(market, db)
        current_odds = parimutuel_data.get(selection.id, {}).get("odds", selection.odds)
        # Potential win is an estimate (will change as more bets come in)
        potential_win = data.stake * current_odds
        is_parimutuel = True
    else:
        # Fixed odds - locked at time of bet
        current_odds = selection.odds
        potential_win = data.stake * current_odds
        is_parimutuel = False

    # Create bet
    bet = Bet(
        user_id=user.id,
        selection_id=selection.id,
        stake=data.stake,
        odds_at_time=current_odds,
        potential_win=potential_win,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)

    # Log activity
    odds_type = "est." if is_parimutuel else ""
    await log_activity(
        db,
        "bet_placed",
        f"{user.name} bet {data.stake} tokens on {selection.name} @ {odds_type}{current_odds:.2f}",
        user_id=user.id,
        data={
            "bet_id": bet.id,
            "user_name": user.name,
            "selection": selection.name,
            "market": market.name,
            "stake": data.stake,
            "odds": current_odds,
            "potential_win": potential_win,
            "is_parimutuel": is_parimutuel,
        },
    )

    return BetResponse(
        id=bet.id,
        user_id=user.id,
        user_name=user.name,
        selection_id=selection.id,
        selection_name=selection.name,
        market_name=market.name,
        stake=bet.stake,
        odds_at_time=bet.odds_at_time,
        potential_win=bet.potential_win,
        is_parimutuel=is_parimutuel,
        status=bet.status,
        created_at=bet.created_at,
    )


@app.get("/api/bets/my", response_model=list[BetResponse])
async def get_my_bets(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Get current user's bets."""
    bets = db.query(Bet).filter(Bet.user_id == user.id).order_by(Bet.created_at.desc()).all()

    result = []
    for bet in bets:
        market = bet.selection.market
        is_parimutuel = market.betting_type == BettingType.PARIMUTUEL

        # For active parimutuel bets, recalculate current potential win
        if is_parimutuel and bet.status == BetStatus.ACTIVE:
            parimutuel_data = calculate_parimutuel_odds(market, db)
            current_odds = parimutuel_data.get(bet.selection_id, {}).get("odds", bet.odds_at_time)
            current_potential = bet.stake * current_odds
        else:
            current_potential = bet.actual_payout if bet.actual_payout else bet.potential_win

        result.append(
            BetResponse(
                id=bet.id,
                user_id=user.id,
                user_name=user.name,
                selection_id=bet.selection_id,
                selection_name=bet.selection.name,
                market_name=market.name,
                stake=bet.stake,
                odds_at_time=bet.odds_at_time,
                potential_win=current_potential,
                actual_payout=bet.actual_payout,
                is_parimutuel=is_parimutuel,
                status=bet.status,
                created_at=bet.created_at,
            )
        )

    return result


@app.get("/api/bets/all", response_model=list[BetPublic])
async def get_all_bets(db: Session = Depends(get_db)):
    """Get all bets (public view for social feed)."""
    bets = db.query(Bet).order_by(Bet.created_at.desc()).limit(50).all()

    result = []
    for bet in bets:
        market = bet.selection.market
        is_parimutuel = market.betting_type == BettingType.PARIMUTUEL

        # For active parimutuel bets, recalculate current potential win
        if is_parimutuel and bet.status == BetStatus.ACTIVE:
            parimutuel_data = calculate_parimutuel_odds(market, db)
            current_odds = parimutuel_data.get(bet.selection_id, {}).get("odds", bet.odds_at_time)
            current_potential = bet.stake * current_odds
        else:
            current_potential = bet.actual_payout if bet.actual_payout else bet.potential_win

        result.append(
            BetPublic(
                id=bet.id,
                user_name=bet.user.name,
                selection_name=bet.selection.name,
                market_name=market.name,
                stake=bet.stake,
                odds_at_time=bet.odds_at_time,
                potential_win=current_potential,
                is_parimutuel=is_parimutuel,
                created_at=bet.created_at,
            )
        )

    return result


# ============================================================================
# Leaderboard Routes
# ============================================================================


@app.get("/api/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(db: Session = Depends(get_db)):
    """Get leaderboard sorted by token balance — single aggregate query."""
    # Single query: user + bet counts + total staked in one go
    stats = (
        db.query(
            User.id,
            User.name,
            User.balance,
            func.count(Bet.id).label("total_bets"),
            func.sum(case((Bet.status == BetStatus.WON, 1), else_=0)).label("won_bets"),
            func.coalesce(func.sum(Bet.stake), 0).label("total_staked"),
        )
        .outerjoin(Bet, Bet.user_id == User.id)
        .filter(User.is_active.is_(True))
        .group_by(User.id)
        .order_by(User.balance.desc())
        .all()
    )

    # Build streak + badges from settled bets per user (batch query)
    settled_bets = (
        db.query(Bet.user_id, Bet.status, Bet.stake, Bet.created_at)
        .filter(Bet.status.in_([BetStatus.WON, BetStatus.LOST]))
        .order_by(Bet.created_at.desc())
        .all()
    )

    # Group settled bets by user
    user_settled: dict[int, list] = {}
    for b in settled_bets:
        user_settled.setdefault(b.user_id, []).append(b)

    result = []
    for rank, row in enumerate(stats, 1):
        uid, name, balance, total_bets, won_bets, total_staked = row
        won_bets = won_bets or 0
        total_staked = float(total_staked or 0)
        profit = round(balance - STARTING_BALANCE, 2)
        win_rate = round((won_bets / total_bets * 100) if total_bets > 0 else 0, 1)
        roi_pct = round((profit / total_staked * 100) if total_staked > 0 else 0, 1)

        # Streak: count consecutive W or L from most recent settled bet
        streak = ""
        user_bets = user_settled.get(uid, [])
        if user_bets:
            first_status = user_bets[0].status
            count = 0
            for b in user_bets:
                if b.status == first_status:
                    count += 1
                else:
                    break
            if count >= 2:
                streak = f"{'W' if first_status == BetStatus.WON else 'L'}{count}"

        # Badges
        badges: list[str] = []
        if total_bets >= 1:
            badges.append("first_blood")
        max_stake = max((b.stake for b in user_bets), default=0)
        if max_stake >= 20:
            badges.append("high_roller")
        # Lucky streak: 3+ consecutive wins anywhere in history
        consec_wins = 0
        max_consec = 0
        for b in reversed(user_bets):  # oldest first
            if b.status == BetStatus.WON:
                consec_wins += 1
                max_consec = max(max_consec, consec_wins)
            else:
                consec_wins = 0
        if max_consec >= 3:
            badges.append("lucky_streak")
        if total_staked >= 500:
            badges.append("whale")
        if win_rate >= 60 and total_bets >= 10:
            badges.append("sharp")

        result.append(
            LeaderboardEntry(
                rank=rank,
                user=UserPublic(id=uid, name=name, balance=balance),
                total_bets=total_bets,
                win_rate=win_rate,
                profit=profit,
                roi_pct=roi_pct,
                total_staked=round(total_staked, 2),
                streak=streak,
                badges=badges,
            )
        )

    return result


@app.get("/api/leaderboard/{user_id}/history", response_model=list[BalanceHistoryEntry])
async def get_balance_history(user_id: int, db: Session = Depends(get_db)):
    """Get balance history for a user, derived from bet settlement timestamps."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    history: list[BalanceHistoryEntry] = [
        BalanceHistoryEntry(
            timestamp=user.created_at,
            balance=STARTING_BALANCE,
            event="joined",
        )
    ]

    # Get all bets for this user ordered by creation time
    bets = db.query(Bet).filter(Bet.user_id == user_id).order_by(Bet.created_at.asc()).all()

    running_balance = STARTING_BALANCE
    for bet in bets:
        # Bet placed: deduct stake
        running_balance -= bet.stake
        history.append(
            BalanceHistoryEntry(
                timestamp=bet.created_at,
                balance=round(running_balance, 2),
                event="bet_placed",
            )
        )
        # If settled, add payout
        if bet.status == BetStatus.WON:
            payout = bet.actual_payout if bet.actual_payout else bet.potential_win
            running_balance += payout
            history.append(
                BalanceHistoryEntry(
                    timestamp=bet.settled_at or bet.created_at,
                    balance=round(running_balance, 2),
                    event="won",
                )
            )
        elif bet.status == BetStatus.LOST:
            history.append(
                BalanceHistoryEntry(
                    timestamp=bet.settled_at or bet.created_at,
                    balance=round(running_balance, 2),
                    event="lost",
                )
            )

    return history


# ============================================================================
# Activity Feed Routes
# ============================================================================


@app.get("/api/activities", response_model=list[ActivityResponse])
async def get_activities(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent activity feed."""
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
            # Keep connection alive, listen for client messages
            await websocket.receive_text()
            # Could handle client messages here if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ============================================================================
# Public Tournament Routes (no auth required)
# ============================================================================


@app.get("/api/tournament/standings", response_model=list[StandingEntry])
async def tournament_standings():
    """Get current tournament standings (W-L-D, legs, leg diff)."""
    invalidate_cache()
    standings = get_standings()
    return [
        StandingEntry(
            rank=i,
            player=r["player"],
            played=r["played"],
            wins=r["wins"],
            losses=r["losses"],
            draws=r["draws"],
            legs_for=r["legs_for"],
            legs_against=r["legs_against"],
            leg_diff=r["leg_diff"],
        )
        for i, r in enumerate(standings, 1)
    ]


@app.get("/api/tournament/ratings", response_model=list[PlayerRatingResponse])
async def tournament_ratings():
    """Get current Elo ratings for all active players (public)."""
    invalidate_cache()
    ratings = get_elo_ratings()
    sorted_ratings = get_sorted_ratings(ratings)
    return [
        PlayerRatingResponse(
            rank=i,
            player=name,
            elo=round(elo, 1),
            wins=ratings[name].wins,
            losses=ratings[name].losses,
            draws=ratings[name].draws,
            games_played=ratings[name].games_played,
        )
        for i, (name, elo) in enumerate(sorted_ratings, 1)
        if ratings[name].games_played > 0
    ]


@app.get("/api/tournament/results", response_model=list[CompletedMatchResponse])
async def tournament_results():
    """Get all completed match results, most recent first."""
    invalidate_cache()
    matches = completed_matches()
    # Return most recent first (by match_id descending)
    return [
        CompletedMatchResponse(
            round=m["round"],
            match_id=m["match_id"],
            player1=m["player1"],
            player2=m["player2"],
            score1=m["score1"],
            score2=m["score2"],
            winner=m["winner"],
            is_draw=m["is_draw"],
        )
        for m in reversed(matches)
    ]


@app.get("/api/tournament/upcoming", response_model=list[ScheduledMatchResponse])
async def tournament_upcoming():
    """Get all upcoming scheduled matches, ordered by round and match_id."""
    invalidate_cache()
    sched = get_scheduled_matches()
    return [
        ScheduledMatchResponse(
            round=m["round"],
            match_id=m["match_id"],
            player1=m["player1"],
            player2=m["player2"],
        )
        for m in sched
    ]


# ============================================================================
# Admin Tournament Routes
# ============================================================================


@app.get("/api/admin/scheduled-matches", response_model=list[ScheduledMatchResponse])
async def admin_scheduled_matches(user: User = Depends(require_admin)):
    """Get all scheduled (unplayed) matches from the tournament CSV."""
    invalidate_cache()  # Always fresh data
    sched = get_scheduled_matches()
    return [
        ScheduledMatchResponse(
            round=m["round"],
            match_id=m["match_id"],
            player1=m["player1"],
            player2=m["player2"],
        )
        for m in sched
    ]


@app.post("/api/admin/enter-result", response_model=EnterResultResponse)
async def admin_enter_result(
    data: EnterResultRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Enter a match result: updates CSV, recalculates Elo and odds."""
    # Validate scores: winner must have 3, loser 0-2
    if data.score1 == 3 and data.score2 in (0, 1, 2):
        pass  # Valid
    elif data.score2 == 3 and data.score1 in (0, 1, 2):
        pass  # Valid
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid score: one player must have 3, other must have 0-2",
        )

    # Write result to CSV (validates match_id, status, winner)
    try:
        write_match_result(data.match_id, data.score1, data.score2, data.winner)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Recalculate Elo ratings
    ratings = get_elo_ratings()
    sorted_ratings = get_sorted_ratings(ratings)

    rating_list = [
        PlayerRatingResponse(
            rank=i,
            player=name,
            elo=round(elo, 1),
            wins=ratings[name].wins,
            losses=ratings[name].losses,
            draws=ratings[name].draws,
            games_played=ratings[name].games_played,
        )
        for i, (name, elo) in enumerate(sorted_ratings, 1)
        if ratings[name].games_played > 0
    ]

    # Recalculate outright odds
    sched = get_scheduled_matches()
    outright = get_outright_odds(ratings, sched)

    odds_list = [
        OutrightOddsEntry(
            player=o["player"],
            true_probability=o["true_probability"],
            implied_probability=o["implied_probability"],
            odds=o["odds"],
            top8_pct=o["top8_pct"],
        )
        for o in outright
    ]

    # Update Selection.odds for open markets with fresh Elo odds
    _refresh_market_elo_odds(db, ratings, sched)

    # Log activity and broadcast
    await log_activity(
        db,
        "match_result",
        f"Match M{data.match_id} result: {data.winner} wins ({data.score1}-{data.score2})",
        user_id=user.id,
        data={
            "match_id": data.match_id,
            "winner": data.winner,
            "score": f"{data.score1}-{data.score2}",
        },
    )

    return EnterResultResponse(
        message="Result entered. Elo ratings and odds updated.",
        match_id=data.match_id,
        winner=data.winner,
        score=f"{data.score1}-{data.score2}",
        updated_ratings=rating_list,
        updated_outright_odds=odds_list,
    )


def _refresh_market_elo_odds(db: Session, ratings: dict, sched: list[dict]):
    """Update Selection.odds for open markets with fresh Elo-derived odds."""
    from odds_engine import get_match_odds as compute_match_odds

    # Build lookup: player name → new outright odds
    outright = get_outright_odds(ratings, sched)
    outright_odds_map = {o["player"]: o["odds"] for o in outright}

    # Build lookup: (player1, player2) → (odds1, odds2)
    match_odds_list = compute_match_odds(ratings, sched)
    match_odds_map = {}
    for mo in match_odds_list:
        match_odds_map[(mo["player1"], mo["player2"])] = (mo["odds1"], mo["odds2"])

    # Update outright markets
    outright_markets = (
        db.query(Market)
        .filter(Market.market_type == "outright", Market.status == MarketStatus.OPEN)
        .all()
    )
    for market in outright_markets:
        for sel in market.selections:
            if sel.name in outright_odds_map:
                sel.odds = outright_odds_map[sel.name]

    # Update match markets
    match_markets = (
        db.query(Market)
        .filter(Market.market_type == "match", Market.status == MarketStatus.OPEN)
        .all()
    )
    for market in match_markets:
        if len(market.selections) == 2:
            p1_name = market.selections[0].name
            p2_name = market.selections[1].name
            key = (p1_name, p2_name)
            rev_key = (p2_name, p1_name)
            if key in match_odds_map:
                market.selections[0].odds = match_odds_map[key][0]
                market.selections[1].odds = match_odds_map[key][1]
            elif rev_key in match_odds_map:
                market.selections[0].odds = match_odds_map[rev_key][1]
                market.selections[1].odds = match_odds_map[rev_key][0]

    db.commit()


@app.get("/api/admin/current-ratings", response_model=list[PlayerRatingResponse])
async def admin_current_ratings(user: User = Depends(require_admin)):
    """Get current Elo ratings for all players."""
    invalidate_cache()
    ratings = get_elo_ratings()
    sorted_ratings = get_sorted_ratings(ratings)

    return [
        PlayerRatingResponse(
            rank=i,
            player=name,
            elo=round(elo, 1),
            wins=ratings[name].wins,
            losses=ratings[name].losses,
            draws=ratings[name].draws,
            games_played=ratings[name].games_played,
        )
        for i, (name, elo) in enumerate(sorted_ratings, 1)
        if ratings[name].games_played > 0
    ]


@app.get("/api/admin/current-odds", response_model=list[OutrightOddsEntry])
async def admin_current_odds(user: User = Depends(require_admin)):
    """Get current outright tournament winner odds (Monte Carlo)."""
    invalidate_cache()
    ratings = get_elo_ratings()
    sched = get_scheduled_matches()
    outright = get_outright_odds(ratings, sched)

    return [
        OutrightOddsEntry(
            player=o["player"],
            true_probability=o["true_probability"],
            implied_probability=o["implied_probability"],
            odds=o["odds"],
            top8_pct=o["top8_pct"],
        )
        for o in outright
    ]


@app.get("/api/admin/liability", response_model=list[LiabilityMarket])
async def admin_liability(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get liability report for all open markets."""
    markets = db.query(Market).filter(Market.status == MarketStatus.OPEN).all()
    result = []

    for market in markets:
        total_pool = sum(s.pool_total for s in market.selections)
        house_cut = market.house_cut or 0.10
        pool_after_cut = total_pool * (1 - house_cut)

        max_payout = 0.0
        sel_liabilities = []
        for sel in market.selections:
            if sel.pool_total > 0:
                payout_if_wins = pool_after_cut
                liability = payout_if_wins - sel.pool_total
            else:
                payout_if_wins = 0.0
                liability = 0.0

            sel_liabilities.append(
                LiabilitySelection(
                    selection=sel.name,
                    pool=round(sel.pool_total, 2),
                    payout_if_wins=round(payout_if_wins, 2),
                    net_liability=round(liability, 2),
                )
            )
            max_payout = max(max_payout, payout_if_wins)

        result.append(
            LiabilityMarket(
                market=market.name,
                total_pool=round(total_pool, 2),
                house_revenue=round(total_pool * house_cut, 2),
                max_payout=round(max_payout, 2),
                selections=sel_liabilities,
            )
        )

    return result


# ============================================================================
# Health Check
# ============================================================================


@app.get("/api/health")
async def health(db: Session = Depends(get_db)):
    # Test DB connectivity
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "secret_key_configured": not SECRET_KEY.startswith("dev-secret-"),
        "version": "1.0.0",
    }


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
