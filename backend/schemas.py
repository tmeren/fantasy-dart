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
    privacy_consent: bool = False
    terms_consent: bool = False
    age_confirmed: bool = False
    whatsapp_consent: bool = False


class UserLogin(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    balance: float
    is_admin: bool
    created_at: datetime
    phone_number: str | None = None
    whatsapp_opted_in: bool = False
    privacy_consent: bool = False
    terms_consent: bool = False
    age_confirmed: bool = False
    whatsapp_consent: bool = False

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
    # Prop data collection fields (S9)
    total_180s: int | None = None
    highest_checkout: int | None = None
    p1_180: bool = False
    p2_180: bool = False
    p1_ton_checkout: bool = False
    p2_ton_checkout: bool = False


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


# ============================================================================
# Prop Market Schemas (S7)
# ============================================================================


class PropSelectionPreview(BaseModel):
    """A single selection in a prop market preview."""

    name: str
    odds: float


class PropMarketPreview(BaseModel):
    """Preview of a prop market generated by the calculator (not yet persisted)."""

    name: str
    description: str
    selections: list[PropSelectionPreview]
    match_round: int
    match_id: int


class GeneratePropMarketsRequest(BaseModel):
    match_id: int


# ============================================================================
# Match Stats Schemas (S9)
# ============================================================================


class UpdateMatchStats(BaseModel):
    """Update prop data collection fields for a completed match."""

    total_180s: int | None = None
    highest_checkout: int | None = None
    p1_180: bool | None = None
    p2_180: bool | None = None
    p1_ton_checkout: bool | None = None
    p2_ton_checkout: bool | None = None


class MatchStatsResponse(BaseModel):
    match_id: int
    player1: str
    player2: str
    total_180s: int | None
    highest_checkout: int | None
    p1_180: bool
    p2_180: bool
    p1_ton_checkout: bool
    p2_ton_checkout: bool


# ============================================================================
# WhatsApp / Phone Schemas (S19)
# ============================================================================


class PhoneUpdateRequest(BaseModel):
    phone_number: str


class PhoneUpdateResponse(BaseModel):
    message: str
    phone_number: str
    whatsapp_opted_in: bool


class WhatsAppOptInRequest(BaseModel):
    opted_in: bool


class WhatsAppSendRequest(BaseModel):
    template: (
        str  # 'match_day_reminder', 'results_announcement', 'weekly_leaderboard', 'pub_quiz_poll'
    )


class WhatsAppLogResponse(BaseModel):
    id: int
    user_id: int | None
    message_type: str
    template_name: str
    status: str
    meta_message_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class QuizQuestionCreate(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    category: str


class QuizQuestionResponse(BaseModel):
    id: int
    question: str
    options: list[str]
    correct_answer: str
    category: str
    created_at: datetime


class QuizResponseCreate(BaseModel):
    question_id: int
    answer: str


class QuizResultResponse(BaseModel):
    question_id: int
    answer: str
    is_correct: bool
    correct_answer: str
