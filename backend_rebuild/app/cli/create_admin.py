import argparse
from datetime import UTC, datetime
from getpass import getpass
import os

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.asyncio_compat import run_async
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import AsyncSessionFactory
from app.models.enums import AccountStatus, UserRole
from app.models.user import User
from app.services.audit_service import AuditService


settings = get_settings()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or promote a HomeLink admin.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", required=True)
    parser.add_argument("--phone", required=True)
    return parser.parse_args()


async def create_admin(*, email: str, full_name: str, phone: str, password: str) -> None:
    normalized_email = email.strip().lower()
    normalized_name = " ".join(full_name.strip().split())
    normalized_phone = phone.strip().replace(" ", "")

    async with AsyncSessionFactory() as session:
        user = await session.scalar(
            select(User).where(User.email == normalized_email).with_for_update()
        )
        now = datetime.now(UTC)

        if user is None:
            user = User(
                full_name=normalized_name,
                email=normalized_email,
                phone=normalized_phone,
                password_hash=hash_password(password),
                role=UserRole.ADMIN,
                status=AccountStatus.ACTIVE,
                is_email_verified=True,
                email_verified_at=now,
                password_changed_at=now,
                terms_accepted_at=now,
                privacy_notice_acknowledged_at=now,
                terms_version=settings.terms_version,
                privacy_version=settings.privacy_version,
            )
            session.add(user)
            action = "cli.admin_created"
        else:
            user.full_name = normalized_name
            user.phone = normalized_phone
            user.password_hash = hash_password(password)
            user.role = UserRole.ADMIN
            user.status = AccountStatus.ACTIVE
            user.is_email_verified = True
            user.email_verified_at = now
            user.deleted_at = None
            user.anonymized_at = None
            user.auth_version += 1
            action = "cli.admin_promoted"

        try:
            await session.flush()
            AuditService(session).add(
                action=action,
                actor_user_id=user.id,
                target_type="user",
                target_id=str(user.id),
                details={"email": normalized_email},
            )
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise SystemExit(
                "Admin could not be created. The email or phone is already in use."
            ) from exc

        print(f"Admin ready: {user.email} ({user.id})")


def main() -> None:
    args = parse_args()
    password = os.environ.get("HOMELINK_ADMIN_PASSWORD") or getpass(
        "Admin password: "
    )
    confirmation = os.environ.get("HOMELINK_ADMIN_PASSWORD") or getpass(
        "Confirm password: "
    )
    if password != confirmation:
        raise SystemExit("Passwords do not match.")
    if len(password) < 10:
        raise SystemExit("Admin password must contain at least 10 characters.")

    run_async(
        create_admin(
            email=args.email,
            full_name=args.full_name,
            phone=args.phone,
            password=password,
        )
    )


if __name__ == "__main__":
    main()