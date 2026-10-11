from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Request,
)

from app.api.auth_dependencies import (
    require_roles,
)
from app.api.dependencies import (
    DbSession,
)
from app.core.rate_limit import (
    get_client_ip,
)
from app.models.enums import (
    AdvertisementPlacement,
    AdvertisementStatus,
    UserRole,
)
from app.models.user import User
from app.schemas.admin_advertising import (
    AdminAdvertisementListResponse,
    AdminAdvertisementRead,
    AdvertisementApproveRequest,
    AdvertisementModerationReasonRequest,
)
from app.services.admin_advertising_service import (
    AdminAdvertisingService,
)


router = APIRouter(
    prefix="/admin/advertisements",
    tags=[
        "admin-advertisements",
    ],
)


AdminUser = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.ADMIN
        )
    ),
]


def request_audit_values(
    request: Request,
) -> tuple[
    str | None,
    str | None,
    str | None,
]:
    request_id = request.headers.get(
        "x-request-id"
    )

    ip_address = get_client_ip(
        request
    )

    user_agent = request.headers.get(
        "user-agent"
    )

    return (
        request_id,
        ip_address,
        user_agent,
    )


@router.get(
    "",
    response_model=(
        AdminAdvertisementListResponse
    ),
)
async def list_advertisements(
    session: DbSession,
    _: AdminUser,
    status: (
        AdvertisementStatus
        | None
    ) = Query(
        default=None
    ),
    placement: (
        AdvertisementPlacement
        | None
    ) = Query(
        default=None
    ),
    limit: int = Query(
        default=30,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> AdminAdvertisementListResponse:
    """
    Paginated advert moderation queue.

    Optional status and placement filters use indexed database
    columns.
    """

    (
        advertisements,
        total,
    ) = await AdminAdvertisingService(
        session
    ).list_advertisements(
        status=status,
        placement=placement,
        limit=limit,
        offset=offset,
    )

    return AdminAdvertisementListResponse(
        items=[
            AdminAdvertisementRead
            .model_validate(
                advertisement
            )
            for advertisement
            in advertisements
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{advertisement_id}",
    response_model=(
        AdminAdvertisementRead
    ),
)
async def get_advertisement(
    advertisement_id: UUID,
    session: DbSession,
    _: AdminUser,
) -> AdminAdvertisementRead:
    advertisement = (
        await AdminAdvertisingService(
            session
        ).get_advertisement(
            advertisement_id
        )
    )

    return (
        AdminAdvertisementRead
        .model_validate(
            advertisement
        )
    )


@router.post(
    "/{advertisement_id}/approve",
    response_model=(
        AdminAdvertisementRead
    ),
)
async def approve_advertisement(
    advertisement_id: UUID,
    payload: AdvertisementApproveRequest,
    request: Request,
    session: DbSession,
    admin: AdminUser,
) -> AdminAdvertisementRead:
    (
        request_id,
        ip_address,
        user_agent,
    ) = request_audit_values(
        request
    )

    advertisement = (
        await AdminAdvertisingService(
            session
        ).approve(
            admin=admin,
            advertisement_id=(
                advertisement_id
            ),
            go_live_now=(
                payload.go_live_now
            ),
            scheduled_start_date=(
                payload
                .scheduled_start_date
            ),
            review_notes=(
                payload.review_notes
            ),
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )

    return (
        AdminAdvertisementRead
        .model_validate(
            advertisement
        )
    )


@router.post(
    "/{advertisement_id}/request-changes",
    response_model=(
        AdminAdvertisementRead
    ),
)
async def request_advertisement_changes(
    advertisement_id: UUID,
    payload: (
        AdvertisementModerationReasonRequest
    ),
    request: Request,
    session: DbSession,
    admin: AdminUser,
) -> AdminAdvertisementRead:
    (
        request_id,
        ip_address,
        user_agent,
    ) = request_audit_values(
        request
    )

    advertisement = (
        await AdminAdvertisingService(
            session
        ).request_changes(
            admin=admin,
            advertisement_id=(
                advertisement_id
            ),
            reason=payload.reason,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )

    return (
        AdminAdvertisementRead
        .model_validate(
            advertisement
        )
    )


@router.post(
    "/{advertisement_id}/reject",
    response_model=(
        AdminAdvertisementRead
    ),
)
async def reject_advertisement(
    advertisement_id: UUID,
    payload: (
        AdvertisementModerationReasonRequest
    ),
    request: Request,
    session: DbSession,
    admin: AdminUser,
) -> AdminAdvertisementRead:
    (
        request_id,
        ip_address,
        user_agent,
    ) = request_audit_values(
        request
    )

    advertisement = (
        await AdminAdvertisingService(
            session
        ).reject(
            admin=admin,
            advertisement_id=(
                advertisement_id
            ),
            reason=payload.reason,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )

    return (
        AdminAdvertisementRead
        .model_validate(
            advertisement
        )
    )


@router.post(
    "/{advertisement_id}/cancel",
    response_model=(
        AdminAdvertisementRead
    ),
)
async def cancel_advertisement(
    advertisement_id: UUID,
    payload: (
        AdvertisementModerationReasonRequest
    ),
    request: Request,
    session: DbSession,
    admin: AdminUser,
) -> AdminAdvertisementRead:
    (
        request_id,
        ip_address,
        user_agent,
    ) = request_audit_values(
        request
    )

    advertisement = (
        await AdminAdvertisingService(
            session
        ).cancel(
            admin=admin,
            advertisement_id=(
                advertisement_id
            ),
            reason=payload.reason,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )

    return (
        AdminAdvertisementRead
        .model_validate(
            advertisement
        )
    )