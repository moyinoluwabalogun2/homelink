from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select

from app.api.auth_dependencies import require_roles
from app.api.dependencies import DbSession
from app.models.agent import AgentProfile
from app.models.enums import (
    AccountStatus,
    AgentApplicationStatus,
    UserRole,
)
from app.models.user import User
from app.repositories.auth_session_repository import AuthSessionRepository
from app.schemas.finalization import (
    AdminUserRead,
    AdminUserRoleUpdate,
    AdminUserStatusUpdate,
)
from app.services.audit_service import AuditService


router = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
)

AdminUser = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.ADMIN
        )
    ),
]


# ============================================================
# LIST USERS
# ============================================================


@router.get(
    "",
    response_model=list[AdminUserRead],
)
async def list_users(
    session: DbSession,
    _: AdminUser,
    q: str | None = Query(
        default=None,
        max_length=120,
    ),
    role: UserRole | None = None,
    status: AccountStatus | None = None,
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[AdminUserRead]:
    statement = select(
        User
    )

    if q:
        pattern = (
            f"%{q.strip()}%"
        )

        statement = statement.where(
            or_(
                User.full_name.ilike(
                    pattern
                ),
                User.email.ilike(
                    pattern
                ),
                User.phone.ilike(
                    pattern
                ),
            )
        )

    if role is not None:
        statement = statement.where(
            User.role == role
        )

    if status is not None:
        statement = statement.where(
            User.status == status
        )

    result = await session.scalars(
        statement
        .order_by(
            User.created_at.desc()
        )
        .limit(
            limit
        )
        .offset(
            offset
        )
    )

    return [
        AdminUserRead.model_validate(
            user
        )
        for user in result.all()
    ]


# ============================================================
# UPDATE ACCOUNT STATUS
# ============================================================


@router.patch(
    "/{user_id}/status",
    response_model=AdminUserRead,
)
async def update_user_status(
    user_id: UUID,
    payload: AdminUserStatusUpdate,
    session: DbSession,
    admin: AdminUser,
) -> AdminUserRead:
    if user_id == admin.id:
        raise HTTPException(
            status_code=409,
            detail=(
                "You cannot change your own "
                "account status here."
            ),
        )

    if (
        payload.status
        == AccountStatus.PENDING_VERIFICATION
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Use email verification rather "
                "than setting pending status manually."
            ),
        )

    if payload.status in {
        AccountStatus.SUSPENDED,
        AccountStatus.DEACTIVATED,
    }:
        if (
            not payload.reason
            or len(
                payload.reason.strip()
            )
            < 5
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "A reason is required for "
                    "suspension or deactivation."
                ),
            )

    user = await session.scalar(
        select(
            User
        )
        .where(
            User.id == user_id
        )
        .with_for_update()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if (
        user.deleted_at is not None
        or user.anonymized_at is not None
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "An anonymized account cannot "
                "be reactivated."
            ),
        )

    # --------------------------------------------------------
    # ADMIN SAFETY BOUNDARY
    #
    # Administrator lifecycle changes are intentionally NOT
    # allowed through the normal web admin API.
    #
    # This prevents:
    # - one compromised admin from disabling another admin
    # - accidental loss of the final usable administrator
    # - browser/API-based administrator takeover workflows
    #
    # Administrator account management should use the
    # controlled server-side/CLI process.
    # --------------------------------------------------------

    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=409,
            detail=(
                "Administrator account status "
                "cannot be changed through this endpoint."
            ),
        )

    previous = user.status

    user.status = (
        payload.status
    )

    # Immediately invalidate existing access tokens.
    user.auth_version += 1

    await AuthSessionRepository(
        session
    ).revoke_all_for_user(
        user_id=user.id,
        revoked_at=datetime.now(
            UTC
        ),
    )

    AuditService(
        session
    ).add(
        action=(
            "admin.user_status_changed"
        ),
        actor_user_id=admin.id,
        target_type="user",
        target_id=str(
            user.id
        ),
        details={
            "previous_status": (
                previous.value
            ),
            "new_status": (
                payload.status.value
            ),
            "reason": (
                payload.reason
            ),
        },
    )

    await session.commit()

    return AdminUserRead.model_validate(
        user
    )


# ============================================================
# UPDATE USER ROLE
# ============================================================


@router.patch(
    "/{user_id}/role",
    response_model=AdminUserRead,
)
async def update_user_role(
    user_id: UUID,
    payload: AdminUserRoleUpdate,
    session: DbSession,
    admin: AdminUser,
) -> AdminUserRead:
    if user_id == admin.id:
        raise HTTPException(
            status_code=409,
            detail=(
                "You cannot change your own "
                "administrator role here."
            ),
        )

    user = await session.scalar(
        select(
            User
        )
        .where(
            User.id == user_id
        )
        .with_for_update()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if (
        user.deleted_at is not None
        or user.anonymized_at is not None
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "An anonymized account cannot "
                "receive a new role."
            ),
        )

    # --------------------------------------------------------
    # ADMIN SAFETY BOUNDARY
    #
    # The web admin API may not:
    # - promote somebody to ADMIN
    # - demote an existing ADMIN
    #
    # Administrator creation/removal must happen through the
    # controlled server-side administration process.
    # --------------------------------------------------------

    if (
        user.role == UserRole.ADMIN
        or payload.role == UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Administrator roles cannot be "
                "created or changed through this endpoint."
            ),
        )

    # --------------------------------------------------------
    # AGENT ROLE INTEGRITY
    #
    # Nobody may receive the AGENT role unless HomeLink has
    # already approved their verification application.
    # --------------------------------------------------------

    if payload.role == UserRole.AGENT:
        profile = await session.scalar(
            select(
                AgentProfile
            ).where(
                AgentProfile.user_id
                == user.id
            )
        )

        if (
            profile is None
            or profile.status
            != AgentApplicationStatus.APPROVED
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "An approved agent profile "
                    "is required for the agent role."
                ),
            )

    previous = user.role

    user.role = (
        payload.role
    )

    # Existing access tokens contain the old role.
    user.auth_version += 1

    await AuthSessionRepository(
        session
    ).revoke_all_for_user(
        user_id=user.id,
        revoked_at=datetime.now(
            UTC
        ),
    )

    AuditService(
        session
    ).add(
        action=(
            "admin.user_role_changed"
        ),
        actor_user_id=admin.id,
        target_type="user",
        target_id=str(
            user.id
        ),
        details={
            "previous_role": (
                previous.value
            ),
            "new_role": (
                payload.role.value
            ),
            "reason": (
                payload.reason
            ),
        },
    )

    await session.commit()

    return AdminUserRead.model_validate(
        user
    )