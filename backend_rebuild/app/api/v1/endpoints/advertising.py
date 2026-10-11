from __future__ import annotations

from uuid import UUID

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
)
from fastapi.responses import (
    RedirectResponse,
)

from app.api.dependencies import (
    DbSession,
    RedisClient,
)
from app.core.rate_limit import (
    fingerprint,
    get_client_ip,
    protect_endpoint,
)
from app.models.enums import (
    AdvertisementPlacement,
)
from app.schemas.advertising import (
    AdvertisementCreateRequest,
    AdvertisementCreateResponse,
    AdvertisementManagedUpdateRequest,
    AdvertisementManagementRequest,
    AdvertisementRead,
    AdvertisementUpdateRequest,
)
from app.schemas.public_advertising import (
    PublicAdvertisementRead,
)
from app.services.advertisement_delivery_service import (
    AdvertisementDeliveryService,
)
from app.services.advertising_service import (
    AdvertisingService,
)


router = APIRouter(
    prefix="/advertisements",
    tags=[
        "advertisements",
    ],
)


def visitor_fingerprint(
    request: Request,
) -> str:
    client_ip = get_client_ip(
        request
    )

    user_agent = (
        request.headers.get(
            "user-agent",
            "",
        )
    )

    return fingerprint(
        f"{client_ip}:"
        f"{user_agent}"
    )


@router.post(
    "",
    response_model=(
        AdvertisementCreateResponse
    ),
    status_code=201,
)
async def create_advertisement(
    payload: AdvertisementCreateRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementCreateResponse:
    """
    Submit an advertisement without requiring a HomeLink
    account.

    The advert begins in payment_pending status. Its seven-day
    campaign timer does not begin during submission.
    """

    client_ip = get_client_ip(
        request
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-create:"
            f"ip:{fingerprint(client_ip)}"
        ),
        limit=5,
        window_seconds=60 * 60,
        unavailable_message=(
            "Advertisement submission protection "
            "is temporarily unavailable."
        ),
    )

    service = AdvertisingService(
        session
    )

    try:
        (
            advertisement,
            management_token,
        ) = await service.create_advertisement(
            payload=payload,
        )

        await session.commit()

    except Exception:
        await session.rollback()
        raise

    return AdvertisementCreateResponse(
        advertisement=(
            AdvertisementRead.model_validate(
                advertisement
            )
        ),
        management_token=management_token,
    )


# ============================================================
# PUBLIC LIVE ADVERTISEMENT DELIVERY
#
# Keep these routes above management routes for clarity.
# ============================================================


@router.get(
    "/live/{placement}",
    response_model=list[
        PublicAdvertisementRead
    ],
)
async def list_live_advertisements(
    placement: AdvertisementPlacement,
    request: Request,
    session: DbSession,
    redis: RedisClient,
    area_id: UUID | None = Query(
        default=None,
    ),
) -> list[PublicAdvertisementRead]:
    """
    Return at most three currently live adverts for one
    placement.

    Results are cached by placement and area for 60 seconds.
    """

    client_ip = get_client_ip(
        request
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-live:"
            f"ip:{fingerprint(client_ip)}:"
            f"placement:{placement.value}"
        ),
        limit=120,
        window_seconds=60,
        unavailable_message=(
            "Sponsored content is "
            "temporarily unavailable."
        ),
    )

    return await AdvertisementDeliveryService(
        session,
        redis,
    ).list_live(
        placement=placement,
        area_id=area_id,
    )


@router.post(
    "/{advertisement_id}/impression",
    response_model=dict[
        str,
        bool,
    ],
)
async def record_advertisement_impression(
    advertisement_id: UUID,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> dict[str, bool]:
    """
    Record one deduplicated impression.

    A repeated page refresh from the same visitor does not
    repeatedly write to PostgreSQL.
    """

    recorded = (
        await AdvertisementDeliveryService(
            session,
            redis,
        ).record_impression(
            advertisement_id=(
                advertisement_id
            ),
            visitor_fingerprint=(
                visitor_fingerprint(
                    request
                )
            ),
        )
    )

    return {
        "recorded": recorded,
    }


@router.get(
    "/{advertisement_id}/click",
    response_class=RedirectResponse,
    status_code=307,
)
async def follow_advertisement_click(
    advertisement_id: UUID,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> RedirectResponse:
    """
    Count a deduplicated click and redirect to the advert's
    stored destination URL.

    The destination is always read from the database, never
    accepted from a query parameter.
    """

    destination_url = (
        await AdvertisementDeliveryService(
            session,
            redis,
        ).get_click_destination(
            advertisement_id=(
                advertisement_id
            ),
            visitor_fingerprint=(
                visitor_fingerprint(
                    request
                )
            ),
        )
    )

    if destination_url is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "This advertisement is "
                "no longer available."
            ),
        )

    return RedirectResponse(
        url=destination_url,
        status_code=307,
    )


# ============================================================
# PRIVATE ADVERTISER MANAGEMENT
# ============================================================


@router.post(
    "/manage",
    response_model=AdvertisementRead,
)
async def get_managed_advertisement(
    payload: AdvertisementManagementRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementRead:
    """
    Retrieve an advert using its private management token.

    POST prevents the token from appearing in the URL, browser
    history, proxy logs or standard analytics URLs.
    """

    client_ip = get_client_ip(
        request
    )

    token_fingerprint = fingerprint(
        payload.management_token
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-manage-read:"
            f"ip:{fingerprint(client_ip)}:"
            f"token:{token_fingerprint}"
        ),
        limit=30,
        window_seconds=10 * 60,
        unavailable_message=(
            "Advertisement management protection "
            "is temporarily unavailable."
        ),
    )

    advertisement = (
        await AdvertisingService(
            session
        ).get_managed_advertisement(
            management_token=(
                payload.management_token
            ),
        )
    )

    return AdvertisementRead.model_validate(
        advertisement
    )


@router.patch(
    "/manage",
    response_model=AdvertisementRead,
)
async def update_managed_advertisement(
    payload: AdvertisementManagedUpdateRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementRead:
    """
    Edit an advert using its private management token.
    """

    client_ip = get_client_ip(
        request
    )

    token_fingerprint = fingerprint(
        payload.management_token
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-manage-update:"
            f"ip:{fingerprint(client_ip)}:"
            f"token:{token_fingerprint}"
        ),
        limit=15,
        window_seconds=10 * 60,
        unavailable_message=(
            "Advertisement management protection "
            "is temporarily unavailable."
        ),
    )

    update_values = payload.model_dump(
        exclude={
            "management_token",
        },
        exclude_unset=True,
    )

    update_payload = (
        AdvertisementUpdateRequest
        .model_validate(
            update_values
        )
    )

    service = AdvertisingService(
        session
    )

    try:
        advertisement = (
            await service
            .update_managed_advertisement(
                management_token=(
                    payload.management_token
                ),
                payload=update_payload,
            )
        )

        await session.commit()

    except Exception:
        await session.rollback()
        raise

    return AdvertisementRead.model_validate(
        advertisement
    )


@router.post(
    "/manage/cancel",
    response_model=AdvertisementRead,
)
async def cancel_managed_advertisement(
    payload: AdvertisementManagementRequest,
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> AdvertisementRead:
    """
    Cancel an eligible advert using its private management
    token.
    """

    client_ip = get_client_ip(
        request
    )

    token_fingerprint = fingerprint(
        payload.management_token
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-manage-cancel:"
            f"ip:{fingerprint(client_ip)}:"
            f"token:{token_fingerprint}"
        ),
        limit=5,
        window_seconds=60 * 60,
        unavailable_message=(
            "Advertisement management protection "
            "is temporarily unavailable."
        ),
    )

    service = AdvertisingService(
        session
    )

    try:
        advertisement = (
            await service
            .cancel_managed_advertisement(
                management_token=(
                    payload.management_token
                ),
            )
        )

        await session.commit()

    except Exception:
        await session.rollback()
        raise

    return AdvertisementRead.model_validate(
        advertisement
    )