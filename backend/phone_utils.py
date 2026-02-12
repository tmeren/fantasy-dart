"""Phone number validation — E.164 format enforcement."""

import re

from fastapi import HTTPException

# E.164: + followed by 1-15 digits (ITU-T E.164 standard)
E164_PATTERN = re.compile(r"^\+[1-9]\d{1,14}$")


def validate_e164(phone: str) -> str:
    """Validate and normalize a phone number to E.164 format.

    Accepts:
      +905551234567   (already E.164)
      05551234567     (Turkish local — prepends +90)
      5551234567      (Turkish without leading 0 — prepends +90)

    Raises HTTPException 400 if the result doesn't match E.164.
    """
    raw = phone.strip()

    # Already has + prefix — validate directly
    if raw.startswith("+"):
        if not E164_PATTERN.match(raw):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid phone number. Must be E.164 format (e.g. +905551234567). Got: {raw}",
            )
        return raw

    # Strip non-digit characters for local format handling
    digits = re.sub(r"\D", "", raw)

    # Turkish local: starts with 0, 11 digits total → replace leading 0 with +90
    if digits.startswith("0") and len(digits) == 11:
        normalized = f"+9{digits}"  # 0xxx → +90xxx (the 0 becomes part of +90)
        # Actually: 05551234567 → +905551234567
        normalized = f"+90{digits[1:]}"
    # Turkish without leading 0: 10 digits
    elif len(digits) == 10 and digits[0] == "5":
        normalized = f"+90{digits}"
    else:
        # Generic: prepend + and hope for the best
        normalized = f"+{digits}"

    if not E164_PATTERN.match(normalized):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid phone number. Must be E.164 format (e.g. +905551234567). Got: {raw}",
        )

    return normalized
