from datetime import datetime
from uuid import UUID

from fastapi import (
    APIRouter,
    Query,
    Response,
)

from app.api.auth_dependencies import (
    CurrentUser,
)
from app.api.dependencies import (
    DbSession,
    RedisClient,
)
from app.core.rate_limit import (
    protect_endpoint,
)
from app.schemas.engagement import (
    InquiryCreate,
    InquiryInboxItemRead,
    InquiryMessageCreate,
    InquiryMessageRead,
    InquiryRead,
    InquiryStatusUpdate,
    InquiryThreadRead,
    ListingReportCreate,
    ListingReportRead,
    SavedListingRead,
)
from app.services.engagement_query_service import (
    EngagementQueryService,
)
from app.services.engagement_service import (
    EngagementService,
)


router = APIRouter(
    tags=[
        "engagements",
    ],
)


# ============================================================
# SAVED LISTINGS
# ============================================================


@router.get(
    "/saved-listings",
    response_model=list[
        SavedListingRead
    ],
)
async def list_saved_listings(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[SavedListingRead]:
    records = await (
        EngagementQueryService(
            session
        ).list_saved(
            user=current_user,
            limit=limit,
            offset=offset,
        )
    )

    return [
        SavedListingRead.model_validate(
            item
        )
        for item in records
    ]


@router.post(
    "/saved-listings/{listing_id}",
    response_model=SavedListingRead,
    status_code=201,
)
async def save_listing(
    listing_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> SavedListingRead:
    record = await EngagementService(
        session
    ).save_listing(
        user=current_user,
        listing_id=listing_id,
    )

    return (
        SavedListingRead
        .model_validate(
            record
        )
    )


@router.delete(
    "/saved-listings/{listing_id}",
    status_code=204,
)
async def remove_saved_listing(
    listing_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> None:
    await EngagementService(
        session
    ).remove_saved_listing(
        user=current_user,
        listing_id=listing_id,
    )


# ============================================================
# CREATE INQUIRY / START CONVERSATION
# ============================================================


@router.post(
    "/listings/{listing_id}/inquiries",
    status_code=201,
    response_model=None,
)
async def create_inquiry(
    listing_id: UUID,
    payload: InquiryCreate,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> Response:
    await protect_endpoint(
        redis,
        key=(
            "inquiry-create:"
            f"user:{current_user.id}"
        ),
        limit=10,
        window_seconds=600,
    )

    await EngagementService(
        session
    ).create_inquiry(
        user=current_user,
        listing_id=listing_id,
        payload=payload,
    )

    return Response(
        status_code=201
    )


# ============================================================
# MESSAGE INBOX
# ============================================================


@router.get(
    "/inquiries",
    response_model=list[
        InquiryInboxItemRead
    ],
)
async def list_inbox(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    before: datetime | None = Query(
        default=None,
    ),
) -> list[InquiryInboxItemRead]:
    """
    Return the user's lightweight combined inbox.

    One request replaces separate sent and received requests.
    """

    return await EngagementService(
        session
    ).list_inbox(
        user=current_user,
        limit=limit,
        before=before,
    )


# ============================================================
# LEGACY SENT / RECEIVED
#
# Retained while older frontend areas move to the combined inbox.
# Both endpoints remain bounded.
# ============================================================


@router.get(
    "/inquiries/sent",
    response_model=list[
        InquiryRead
    ],
)
async def list_sent_inquiries(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[InquiryRead]:
    records = await (
        EngagementQueryService(
            session
        ).list_sent(
            user=current_user,
            limit=limit,
            offset=offset,
        )
    )

    return [
        InquiryRead.model_validate(
            item
        )
        for item in records
    ]


@router.get(
    "/inquiries/received",
    response_model=list[
        InquiryRead
    ],
)
async def list_received_inquiries(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[InquiryRead]:
    records = await (
        EngagementQueryService(
            session
        ).list_received(
            user=current_user,
            limit=limit,
            offset=offset,
        )
    )

    return [
        InquiryRead.model_validate(
            item
        )
        for item in records
    ]


# ============================================================
# CONVERSATION THREAD
# ============================================================


@router.get(
    "/inquiries/{inquiry_id}",
    response_model=InquiryThreadRead,
)
async def get_inquiry_thread(
    inquiry_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    before: datetime | None = Query(
        default=None,
    ),
) -> InquiryThreadRead:
    """
    Load one conversation and a bounded page of messages.
    """

    return await EngagementService(
        session
    ).get_thread(
        user=current_user,
        inquiry_id=inquiry_id,
        limit=limit,
        before=before,
    )


# ============================================================
# SEND MESSAGE
# ============================================================


@router.post(
    "/inquiries/{inquiry_id}/messages",
    response_model=(
        InquiryMessageRead
    ),
    status_code=201,
)
async def send_inquiry_message(
    inquiry_id: UUID,
    payload: InquiryMessageCreate,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> InquiryMessageRead:
    """
    Send a reply inside an existing conversation.
    """

    await protect_endpoint(
        redis,
        key=(
            "inquiry-message:"
            f"user:{current_user.id}"
        ),
        limit=30,
        window_seconds=60,
    )

    return await EngagementService(
        session
    ).send_reply(
        user=current_user,
        inquiry_id=inquiry_id,
        payload=payload,
    )


# ============================================================
# MARK CONVERSATION READ
# ============================================================


@router.patch(
    "/inquiries/{inquiry_id}/read",
    status_code=204,
)
async def mark_inquiry_read(
    inquiry_id: UUID,
    session: DbSession,
    current_user: CurrentUser,
) -> None:
    """
    Advance the participant's read cursor.

    This updates one inquiry row instead of updating every
    individual message.
    """

    await EngagementService(
        session
    ).mark_thread_read(
        user=current_user,
        inquiry_id=inquiry_id,
    )


# ============================================================
# INQUIRY STATUS
# ============================================================


@router.patch(
    "/inquiries/{inquiry_id}",
    response_model=InquiryRead,
)
async def update_inquiry(
    inquiry_id: UUID,
    payload: InquiryStatusUpdate,
    session: DbSession,
    current_user: CurrentUser,
) -> InquiryRead:
    inquiry = await EngagementService(
        session
    ).update_inquiry_status(
        user=current_user,
        inquiry_id=inquiry_id,
        status=payload.status,
    )

    return InquiryRead.model_validate(
        inquiry
    )


# ============================================================
# REPORTS
# ============================================================


@router.post(
    "/listings/{listing_id}/reports",
    response_model=(
        ListingReportRead
    ),
    status_code=201,
)
async def report_listing(
    listing_id: UUID,
    payload: ListingReportCreate,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> ListingReportRead:
    await protect_endpoint(
        redis,
        key=(
            "listing-report:"
            f"user:{current_user.id}"
        ),
        limit=5,
        window_seconds=3600,
    )

    report = await EngagementService(
        session
    ).create_report(
        user=current_user,
        listing_id=listing_id,
        payload=payload,
    )

    return (
        ListingReportRead
        .model_validate(
            report
        )
    )


@router.get(
    "/reports/mine",
    response_model=list[
        ListingReportRead
    ],
)
async def list_my_reports(
    session: DbSession,
    current_user: CurrentUser,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> list[ListingReportRead]:
    records = await (
        EngagementQueryService(
            session
        ).list_my_reports(
            user=current_user,
            limit=limit,
            offset=offset,
        )
    )

    return [
        ListingReportRead.model_validate(
            item
        )
        for item in records
    ]