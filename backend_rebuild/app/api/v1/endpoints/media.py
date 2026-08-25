from fastapi import APIRouter

from app.api.auth_dependencies import CurrentUser
from app.schemas.media import (
    MediaUploadSignatureRequest,
    MediaUploadSignatureResponse,
)
from app.services.media_service import MediaService


router = APIRouter(
    prefix="/media",
    tags=["media"],
)


@router.post(
    "/upload-signature",
    response_model=MediaUploadSignatureResponse,
)
async def create_upload_signature(
    payload: MediaUploadSignatureRequest,
    current_user: CurrentUser,
) -> MediaUploadSignatureResponse:
    return MediaService().create_upload_signature(
        user_id=current_user.id,
        resource_type=payload.resource_type,
        scope=payload.scope,
    )