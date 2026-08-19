from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from app.api.auth_dependencies import CurrentUserUnverifiedAllowed
from app.api.dependencies import DbSession
from app.core.config import get_settings
from app.schemas.finalization import (
    AccountDeleteRequest,
    DataExportRequest,
)
from app.services.account_service import (
    AccountConfirmationError,
    AccountService,
)


router = APIRouter(prefix="/account", tags=["account"])
settings = get_settings()


@router.post("/export")
async def export_account_data(
    payload: DataExportRequest,
    session: DbSession,
    current_user: CurrentUserUnverifiedAllowed,
) -> dict[str, Any]:
    try:
        return await AccountService(session).export_data(
            user=current_user,
            current_password=payload.current_password,
        )
    except AccountConfirmationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    payload: AccountDeleteRequest,
    response: Response,
    session: DbSession,
    current_user: CurrentUserUnverifiedAllowed,
) -> None:
    try:
        await AccountService(session).anonymize_account(
            user=current_user,
            current_password=payload.current_password,
        )
    except AccountConfirmationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.refresh_cookie_samesite,
    )