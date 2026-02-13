"""Auth routes — registration, login, magic link, profile, GDPR endpoints."""

import os
import secrets
from datetime import datetime, timedelta

from crypto import decrypt_phone, encrypt_phone
from database import Activity, Bet, Market, QuizResponse, Selection, User, WhatsAppLog, get_db
from deps import (
    MAGIC_LINK_EXPIRE_MINUTES,
    STARTING_BALANCE,
    create_access_token,
    log_activity,
    require_user,
)
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
        is_admin=data.email == "tmeren@gmail.com",
        privacy_consent=data.privacy_consent,
        terms_consent=data.terms_consent,
        age_confirmed=data.age_confirmed,
        whatsapp_consent=data.whatsapp_consent,
        consent_timestamp=datetime.utcnow()
        if (data.privacy_consent or data.terms_consent)
        else None,
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
    """Get current user info (phone number decrypted for display)."""
    # Decrypt phone number for the response
    response = UserResponse.model_validate(user)
    response.phone_number = decrypt_phone(user.phone_number) if user.phone_number else None
    return response


# ---- Phone / WhatsApp opt-in ----


@router.put("/phone", response_model=PhoneUpdateResponse)
async def update_phone(
    data: PhoneUpdateRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Update current user's phone number (E.164 validated, encrypted at rest)."""
    phone = validate_e164(data.phone_number)
    user.phone_number = encrypt_phone(phone)
    db.commit()
    return PhoneUpdateResponse(
        message="Phone number updated",
        phone_number=phone,  # Return plaintext to the user
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
        phone_number=decrypt_phone(user.phone_number) if user.phone_number else "",
        whatsapp_opted_in=user.whatsapp_opted_in,
    )


# ---- GDPR / KVKK Endpoints (S18) ----


@router.get("/me/export", tags=["gdpr"])
async def export_my_data(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Export all personal data (GDPR Article 20 — data portability).

    Returns a JSON object containing all data categories associated with the user.
    """
    # Collect bets with market context
    bets_data = []
    for bet in db.query(Bet).filter(Bet.user_id == user.id).all():
        selection = db.query(Selection).filter(Selection.id == bet.selection_id).first()
        market = (
            db.query(Market).filter(Market.id == selection.market_id).first() if selection else None
        )
        bets_data.append(
            {
                "id": bet.id,
                "market": market.name if market else "Unknown",
                "selection": selection.name if selection else "Unknown",
                "stake": bet.stake,
                "odds_at_time": bet.odds_at_time,
                "potential_win": bet.potential_win,
                "actual_payout": bet.actual_payout,
                "status": bet.status.value if bet.status else None,
                "created_at": bet.created_at.isoformat() if bet.created_at else None,
            }
        )

    # Collect activities
    activities_data = []
    for act in db.query(Activity).filter(Activity.user_id == user.id).all():
        activities_data.append(
            {
                "type": act.activity_type,
                "message": act.message,
                "created_at": act.created_at.isoformat() if act.created_at else None,
            }
        )

    # Collect WhatsApp logs
    wa_logs = []
    for log in db.query(WhatsAppLog).filter(WhatsAppLog.user_id == user.id).all():
        wa_logs.append(
            {
                "message_type": log.message_type,
                "template_name": log.template_name,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
        )

    return {
        "export_format": "GDPR Article 20 — Personal Data Export",
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "balance": user.balance,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "phone_number": decrypt_phone(user.phone_number) if user.phone_number else None,
            "whatsapp_opted_in": user.whatsapp_opted_in,
            "privacy_consent": user.privacy_consent,
            "terms_consent": user.terms_consent,
            "age_confirmed": user.age_confirmed,
            "whatsapp_consent": user.whatsapp_consent,
            "consent_timestamp": user.consent_timestamp.isoformat()
            if user.consent_timestamp
            else None,
        },
        "predictions": bets_data,
        "activity_log": activities_data,
        "whatsapp_logs": wa_logs,
    }


@router.delete("/me", tags=["gdpr"])
async def delete_my_account(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Delete account and personal data (GDPR Article 17 — right to erasure).

    Anonymizes bet history to preserve game integrity, then deletes the user account.
    """
    user_id = user.id
    user_name = user.name

    # Anonymize bets (keep for game integrity, remove personal identifiers)
    db.query(Bet).filter(Bet.user_id == user_id).update(
        {Bet.user_id: None}, synchronize_session="fetch"
    )

    # Delete activities referencing this user
    db.query(Activity).filter(Activity.user_id == user_id).delete(synchronize_session="fetch")

    # Delete WhatsApp logs
    db.query(WhatsAppLog).filter(WhatsAppLog.user_id == user_id).delete(synchronize_session="fetch")

    # Delete quiz responses
    db.query(QuizResponse).filter(QuizResponse.user_id == user_id).delete(
        synchronize_session="fetch"
    )

    # Delete the user
    db.delete(user)
    db.commit()

    return {
        "message": "Account deleted successfully",
        "detail": f"All personal data for '{user_name}' has been removed. Prediction history has been anonymized.",
    }
