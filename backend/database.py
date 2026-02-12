"""Database configuration and models for Fantasy Darts Betting."""

import enum
import os
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

# Use DATABASE_URL env var for PostgreSQL in production, SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./darts_betting.db")

# Railway sets DATABASE_URL with postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class MarketStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"  # No more bets
    SETTLED = "settled"  # Winner determined


class BetStatus(str, enum.Enum):
    ACTIVE = "active"
    WON = "won"
    LOST = "lost"
    VOID = "void"


class BettingType(str, enum.Enum):
    FIXED = "fixed"  # Traditional bookmaker - fixed odds
    PARIMUTUEL = "parimutuel"  # Pool betting - dynamic odds


class User(Base):
    """User model - players who bet with tokens."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    balance = Column(Float, default=100.0)  # Starting tokens
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Magic link token
    magic_token = Column(String(255), nullable=True)
    magic_token_expires = Column(DateTime, nullable=True)

    # Relationships
    bets = relationship("Bet", back_populates="user")


class Market(Base):
    """Betting market - e.g., 'Championship Winner' or 'QF1: Berkay vs Ece'."""

    __tablename__ = "markets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    market_type = Column(String(50), nullable=False)  # 'outright', 'match', 'prop'
    betting_type = Column(
        SQLEnum(BettingType), default=BettingType.PARIMUTUEL
    )  # fixed or parimutuel
    house_cut = Column(Float, default=0.10)  # 10% house cut for parimutuel
    status = Column(SQLEnum(MarketStatus), default=MarketStatus.OPEN)
    created_at = Column(DateTime, default=datetime.utcnow)
    closes_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)

    # Relationships
    selections = relationship("Selection", back_populates="market")


class Selection(Base):
    """Selection within a market - e.g., 'Berkay to win' at odds 3.00."""

    __tablename__ = "selections"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    name = Column(String(200), nullable=False)
    odds = Column(Float, nullable=False)  # For fixed odds, or initial display odds
    pool_total = Column(Float, default=0.0)  # Total staked on this selection (parimutuel)
    is_winner = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    market = relationship("Market", back_populates="selections")
    bets = relationship("Bet", back_populates="selection")


class Bet(Base):
    """A bet placed by a user on a selection."""

    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    selection_id = Column(Integer, ForeignKey("selections.id"), nullable=False)
    stake = Column(Float, nullable=False)
    odds_at_time = Column(
        Float, nullable=False
    )  # Locked odds when bet placed (fixed) or estimate (parimutuel)
    potential_win = Column(Float, nullable=False)  # Estimated win (may change for parimutuel)
    actual_payout = Column(Float, nullable=True)  # Actual payout at settlement (parimutuel)
    status = Column(SQLEnum(BetStatus), default=BetStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="bets")
    selection = relationship("Selection", back_populates="bets")


class Activity(Base):
    """Activity feed for live updates."""

    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(
        String(50), nullable=False
    )  # 'bet_placed', 'market_settled', 'user_joined'
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text, nullable=False)
    data = Column(Text, nullable=True)  # JSON string for additional data
    created_at = Column(DateTime, default=datetime.utcnow)


def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
