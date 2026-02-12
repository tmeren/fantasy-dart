"""Phone number encryption at rest using Fernet (GDPR/KVKK — S18).

Encrypts phone numbers before database storage, decrypts on retrieval.
Fernet key is loaded from FERNET_KEY environment variable.
"""

import os

from cryptography.fernet import Fernet, InvalidToken

# Load or generate Fernet key
_FERNET_KEY = os.getenv("FERNET_KEY", "")

if not _FERNET_KEY:
    # Auto-generate for development — printed so operator can persist it
    _FERNET_KEY = Fernet.generate_key().decode()
    print("[crypto] WARNING: No FERNET_KEY env var set. Generated ephemeral key.")
    print(f"[crypto] Set FERNET_KEY={_FERNET_KEY} to persist encryption across restarts.")

_fernet = Fernet(_FERNET_KEY.encode() if isinstance(_FERNET_KEY, str) else _FERNET_KEY)


def encrypt_phone(phone: str) -> str:
    """Encrypt a phone number string. Returns base64-encoded ciphertext."""
    if not phone:
        return phone
    return _fernet.encrypt(phone.encode()).decode()


def decrypt_phone(encrypted: str) -> str:
    """Decrypt an encrypted phone number. Returns plaintext E.164 string.

    If decryption fails (e.g. plaintext stored before encryption was enabled),
    returns the value as-is for backwards compatibility.
    """
    if not encrypted:
        return encrypted
    try:
        return _fernet.decrypt(encrypted.encode()).decode()
    except (InvalidToken, Exception):
        # Graceful fallback: value was stored before encryption was enabled
        return encrypted
