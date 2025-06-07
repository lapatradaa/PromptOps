"""
api/utils/crypto.py
————————
Tiny helper that mirrors lib/encryption.ts (AES-256-CBC with IV prepended).

• is_encrypted(text)  – quick regex check
• decrypt_api_key(text) -> str
"""

from __future__ import annotations
import os
import re
import binascii
import hashlib
from typing import Final

from Crypto.Cipher import AES        # pycryptodome
from Crypto.Util.Padding import unpad


# ---------- config ----------

ENV_KEY: Final[str] = "API_KEY_ENCRYPTION_KEY"
_DEFAULT_FALLBACK_KEY = "default-fallback-key"           # must match FE
_FALLBACK_SALT = b"salt"
_DERIVE_SALT = b"promptops-salt"

# 64 hex chars → 32-byte key.  Anything else → scrypt-derive.
_HEX_RE = re.compile(r"^[0-9a-f]{64}$", re.I)
_ENC_RE = re.compile(r"^[0-9a-f]+:[0-9a-f]+$", re.I)


# ---------- helpers ----------

def _derive_key(raw: str) -> bytes:
    if _HEX_RE.fullmatch(raw):
        return binascii.unhexlify(raw)
    # identical derivation to TS: crypto.scryptSync(str, 'promptops-salt', 32)
    return hashlib.scrypt(raw.encode(), salt=b"promptops-salt", n=16384, r=8, p=1, dklen=32)


def _get_key() -> bytes:
    """
    Return the 32-byte AES encryption key:

    1. If the environment variable is a 64-character hex string, decode it directly.
    2. If it’s set to any other string, derive a key via scrypt with 'promptops-salt'.
    3. If it’s unset, derive from 'default-fallback-key' using the 'salt' fallback.
    """
    raw = os.getenv(ENV_KEY)
    if raw:
        # If the key is already provided as 64 hex chars, just decode it
        if _HEX_RE.fullmatch(raw):
            return binascii.unhexlify(raw)
        # Otherwise derive from the passphrase
        return hashlib.scrypt(
            raw.encode("utf-8"),
            salt=_DERIVE_SALT,
            n=16384,
            r=8,
            p=1,
            dklen=32
        )
    # Fallback path: derive from the hard-coded default key
    return hashlib.scrypt(
        _DEFAULT_FALLBACK_KEY.encode("utf-8"),
        salt=_FALLBACK_SALT,
        n=16384,
        r=8,
        p=1,
        dklen=32
    )


# ---------- public API ----------

def is_encrypted(text: str | None) -> bool:
    """True if the value looks like  'ivhex:encryptedhex'."""
    return bool(text) and bool(_ENC_RE.fullmatch(text))   # type: ignore[arg-type]


def decrypt_api_key(encrypted: str) -> str:
    """
    Decrypt a string of form  ivHex:encryptedHex  using AES-256-CBC.
    Returns plaintext or raises ValueError.
    """
    if not is_encrypted(encrypted):
        raise ValueError("String is not in IV:payload hex format")

    iv_hex, payload_hex = encrypted.split(":", 1)
    iv = binascii.unhexlify(iv_hex)
    ciphertext = binascii.unhexlify(payload_hex)
    key = _get_key()

    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    try:
        plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
    except ValueError as e:
        raise ValueError("Padding or key mismatch") from e

    return plaintext.decode("utf-8")
