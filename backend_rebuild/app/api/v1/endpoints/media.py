from fastapi import (
    APIRouter,
    Request,
)

from app.api.auth_dependencies import (
    CurrentUser,
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
from app.schemas.media import (
    MediaUploadSignatureRequest,
    MediaUploadSignatureResponse,
)
from app.services.media_service import (
    MediaService,
)


router = APIRouter(
    prefix="/media",
    tags=[
        "media",
    ],
)


@router.post(
    "/upload-signature",
    response_model=(
        MediaUploadSignatureResponse
    ),
)
async def create_upload_signature(
    payload: MediaUploadSignatureRequest,
    session: DbSession,
    redis: RedisClient,
    current_user: CurrentUser,
) -> MediaUploadSignatureResponse:
    """
    Create an upload signature for an authenticated HomeLink
    user.

    Advertisements use the separate anonymous endpoint below.
    """

    await protect_endpoint(
        redis,
        key=(
            "media-signature:"
            f"user:{current_user.id}"
        ),
        limit=30,
        window_seconds=60,
        unavailable_message=(
            "Upload protection is "
            "temporarily unavailable."
        ),
    )

    result = await MediaService(
        session,
    ).create_upload_signature(
        user_id=current_user.id,
        resource_type=(
            payload.resource_type
        ),
        scope=payload.scope,
    )

    # The unclaimed listing-upload cleanup entry must be durable
    # before the browser starts uploading to Cloudinary.
    await session.commit()

    return result


@router.post(
    "/advertisement-upload-signature",
    response_model=(
        MediaUploadSignatureResponse
    ),
)
async def create_advertisement_upload_signature(
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> MediaUploadSignatureResponse:
    """
    Create an anonymous image-upload signature for a sponsored
    HomeLink advertisement.

    An account is not required, but requests are protected by an
    IP-based rate limit.
    """

    client_ip = get_client_ip(
        request,
    )

    await protect_endpoint(
        redis,
        key=(
            "advertisement-media-signature:"
            f"ip:{fingerprint(client_ip)}"
        ),
        limit=8,
        window_seconds=10 * 60,
        unavailable_message=(
            "Advertisement upload protection "
            "is temporarily unavailable."
        ),
    )

    result = await MediaService(
        session,
    ).create_advertisement_upload_signature()

    # Commit the abandoned-upload cleanup entry before returning
    # the Cloudinary upload permission to the browser.
    await session.commit()

    return result