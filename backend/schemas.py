"""Pydantic schemas for API validation."""

from datetime import datetime

from database import BetStatus, BettingType, MarketStatus
from pydantic import BaseModel, EmailStr

# ============================================================================
# User Schemas
# ============================================================================


class UserCreate(BaseModel):
    email: EmailStr
    name: str


class UserLogin(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    balance: float
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Public user info (for leaderboard, activity feed)."""

    id: int
    name: str
    balance: float

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    rank: int
    user: UserPublic
    total_bets: int
    win_rate: float
    profit: float
    roi_pct: float = 0.0
    total_staked: float = 0.0
    streak: str = ""  # "W3", "L2", or ""
    badges: list[str] = []


class BalanceHistoryEntry(BaseModel):
    timestamp: datetime
    balance: float
    event: str  # "joined", "bet_placed", "won", "lost"


# ============================================================================
# Market Schemas
# ============================================================================


class SelectionCreate(BaseModel):
    name: str
    odds: float


class SelectionResponse(BaseModel):
    id: int
    name: str
    odds: float  # Fixed odds or current dynamic odds
    pool_total: float = 0  # Amount staked on this selection
    pool_percentage: float = 0  # Percentage of total pool
    dynamic_odds: float = 0  # Calculated odds based on pool (parimutuel)
    is_winner: bool

    class Config:
        from_attributes = True


class MarketCreate(BaseModel):
    name: str
    description: str | None = None
    market_type: str  # 'outright', 'match', 'prop'
    betting_type: BettingType = BettingType.PARIMUTUEL  # 'fixed' or 'parimutuel'
    house_cut: float = 0.10  # 10% default house cut for parimutuel
    closes_at: datetime | None = None
    selections: list[SelectionCreate]


class MarketResponse(BaseModel):
    id: int
    name: str
    description: str | None
    market_type: str
    betting_type: BettingType
    house_cut: float
    status: MarketStatus
    created_at: datetime
    closes_at: datetime | None
    selections: list[SelectionResponse]
    total_staked: float | None = 0
    pool_after_cut: float | None = 0  # Total pool minus house cut

    class Config:
        from_attributes = True


class MarketSettle(BaseModel):
    winning_selection_id: int


# ============================================================================
# Bet Schemas
# ============================================================================


class BetCreate(BaseModel):
    selection_id: int
    stake: float


class BetResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    selection_id: int
    selection_name: str
    market_name: str
    stake: float
    odds_at_time: float
    potential_win: float  # Estimated at time of bet
    actual_payout: float | None = None  # Final payout (parimutuel, after settlement)
    is_parimutuel: bool = False  # Whether this is a pool bet
    status: BetStatus
    created_at: datetime

    class Config:
        from_attributes = True


class BetPublic(BaseModel):
    """Public bet info for activity feed."""

    id: int
    user_name: str
    selection_name: str
    market_name: str
    stake: float
    odds_at_time: float
    potential_win: float
    is_parimutuel: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Activity Schemas
# ============================================================================


class ActivityResponse(BaseModel):
    id: int
    activity_type: str
    message: str
    data: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Auth Schemas
# ============================================================================


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerify(BaseModel):
    token: str


# ============================================================================
# Admin / Tournament Schemas
# ============================================================================


class StandingEntry(BaseModel):
    rank: int
    player: str
    played: int
    wins: int
    losses: int
    draws: int
    legs_for: int
    legs_against: int
    leg_diff: int


class CompletedMatchResponse(BaseModel):
    round: int
    match_id: int
    player1: str
    player2: str
    score1: int
    score2: int
    winner: str | None
    is_draw: bool


class ScheduledMatchResponse(BaseModel):
    round: int
    match_id: int
    player1: str
    player2: str


class EnterResultRequest(BaseModel):
    match_id: int
    score1: int
    score2: int
    winner: str


class PlayerRatingResponse(BaseModel):
    rank: int
    player: str
    elo: float
    wins: int
    losses: int
    draws: int
    games_played: int


class OutrightOddsEntry(BaseModel):
    player: str
    true_probability: float
    implied_probability: float
    odds: float
    top8_pct: float


class EnterResultResponse(BaseModel):
    message: str
    match_id: int
    winner: str
    score: str
    updated_ratings: list[PlayerRatingResponse]
    updated_outright_odds: list[OutrightOddsEntry]


class LiabilitySelection(BaseModel):
    selection: str
    pool: float
    payout_if_wins: float
    net_liability: float


class LiabilityMarket(BaseModel):
    market: str
    total_pool: float
    house_revenue: float
    max_payout: float
    selections: list[LiabilitySelection]
