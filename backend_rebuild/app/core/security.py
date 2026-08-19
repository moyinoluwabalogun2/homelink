from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from hmac import compare_digest
import secrets
from uuid import UUID, uuid4

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import get_settings
from app.models.enums import UserRole


settings = get_settings()
password_hasher = PasswordHasher()
DUMMY_PASSWORD_HASH = password_hasher.hash("HomeLink-Dummy-Password-2026")


class AccessTokenError(Exception):
    pass


class CompoundTokenError(Exception):
    pass


@dataclass(frozen=True)
class AccessTokenData:
    user_id: UUID
    role: UserRole
    auth_version: int
    token_id: UUID


def hash_password(plain_password: str) -> str:
    return password_hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    try:
        return password_hasher.check_needs_rehash(password_hash)
    except Exception:
        return True


def create_access_token(*, user_id: UUID, role: UserRole, auth_version: int) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "ver": auth_version,
        "typ": "access",
        "jti": str(uuid4()),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "nbf": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> AccessTokenData:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            leeway=settings.jwt_leeway_seconds,
            options={"require": ["sub", "role", "ver", "typ", "jti", "iss", "aud", "iat", "nbf", "exp"]},
        )
        if payload.get("typ") != "access":
            raise AccessTokenError("Incorrect token type.")
        return AccessTokenData(
            user_id=UUID(str(payload["sub"])),
            role=UserRole(str(payload["role"])),
            auth_version=int(payload["ver"]),
            token_id=UUID(str(payload["jti"])),
        )
    except (InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise AccessTokenError("Invalid or expired access token.") from exc


def create_compound_token(token_id: UUID) -> str:
    return f"{token_id}.{secrets.token_urlsafe(48)}"


def parse_compound_token(raw_token: str) -> UUID:
    try:
        token_id, secret = raw_token.split(".", maxsplit=1)
        if not secret:
            raise ValueError("Missing token secret.")
        return UUID(token_id)
    except (AttributeError, TypeError, ValueError) as exc:
        raise CompoundTokenError("Invalid token.") from exc


def hash_compound_token(raw_token: str) -> str:
    return sha256(raw_token.encode("utf-8")).hexdigest()


def compound_token_matches(raw_token: str, stored_hash: str) -> bool:
    return compare_digest(hash_compound_token(raw_token), stored_hash)