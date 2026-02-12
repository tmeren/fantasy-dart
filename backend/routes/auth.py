"""Auth routes — registration, login, magic link, profile."""

import os
import secrets
from datetime import datetime, timedelta

from database import User, get_db
from deps import create_access_token, log_activity, require_user, STARTING_BALANCE, MAGIC_LINK_EXPIRE_MINUTES
from fastapi import APIRouter, Depends, HTTPException
from phone_utils import validate_e164
from schemas import (
    MagicLinkRequest,
    MagicLinkVerify,
    PhoneUpdateRequest,
    PhoneUpdateResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    WhatsAppOptInRequest,
)
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/auth", tags=["auth"])

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and name. Gets 1000 RTB to start."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        name=data.name,
        balance=STARTING_BALANCE,
        is_admin=db.query(User).count() == 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    await log_activity(
        db,
        "user_joined",
        f"{user.name} joined the game!",
        user_id=user.id,
        data={"user_name": user.name},
    )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email. In production, use magic link."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/magic-link")
async def request_magic_link(data: MagicLinkRequest, db: Session = Depends(get_db)):
    """Request a magic link login (sends email)."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {"message": "If this email is registered, you will receive a login link."}

    token = secrets.token_urlsafe(32)
    user.magic_token = token
    user.magic_token_expires = datetime.utcnow() + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)
    db.commit()

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


@router.post("/verify-magic-link", response_model=TokenResponse)
async def verify_magic_link(data: MagicLinkVerify, db: Session = Depends(get_db)):
    """Verify magic link token and return JWT."""
    user = (
        db.query(User)
        .filter(User.magic_token == data.token, User.magic_token_expires > datetime.utcnow())
        .first()
    )
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.magic_token = None
    user.magic_token_expires = None
    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_user)):
    """Get current user info."""
    return user


# ---- Phone / WhatsApp opt-in ----


@router.put("/phone", response_model=PhoneUpdateResponse)
async def update_phone(
    data: PhoneUpdateRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Update current user's phone number (E.164 validated)."""
    phone = validate_e164(data.phone_number)
    user.phone_number = phone
    db.commit()
    return PhoneUpdateResponse(
        message="Phone number updated",
        phone_number=user.phone_number,
        whatsapp_opted_in=user.whatsapp_opted_in,
    )


@router.delete("/phone")
async def remove_phone(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Remove current user's phone number and opt out of WhatsApp."""
    user.phone_number = None
    user.whatsapp_opted_in = False
    db.commit()
    return {"message": "Phone number removed and WhatsApp opted out"}


@router.put("/whatsapp-opt-in", response_model=PhoneUpdateResponse)
async def toggle_whatsapp_opt_in(
    data: WhatsAppOptInRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Toggle WhatsApp opt-in for current user. Requires phone number."""
    if data.opted_in and not user.phone_number:
        raise HTTPException(
            status_code=400, detail="Add a phone number before opting in to WhatsApp"
        )
    user.whatsapp_opted_in = data.opted_in
    db.commit()
    return PhoneUpdateResponse(
        message=f"WhatsApp {'enabled' if data.opted_in else 'disabled'}",
        phone_number=user.phone_number or "",
        whatsapp_opted_in=user.whatsapp_opted_in,
    )
