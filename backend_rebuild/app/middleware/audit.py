import logging
from uuid import UUID, uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.rate_limit import get_client_ip
from app.core.security import AccessTokenError, decode_access_token
from app.db.session import AsyncSessionFactory
from app.services.audit_service import AuditService


logger = logging.getLogger(__name__)
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid4())
        response: Response

        try:
            response = await call_next(request)
        except Exception:
            await self._write_log(
                request=request,
                request_id=request_id,
                status_code=500,
            )
            raise

        response.headers["X-Request-ID"] = request_id

        if request.method.upper() in WRITE_METHODS:
            await self._write_log(
                request=request,
                request_id=request_id,
                status_code=response.status_code,
            )

        return response

    async def _write_log(
        self,
        *,
        request: Request,
        request_id: str,
        status_code: int,
    ) -> None:
        actor_user_id: UUID | None = None
        authorization = request.headers.get("authorization", "")

        if authorization.lower().startswith("bearer "):
            try:
                actor_user_id = decode_access_token(
                    authorization.split(" ", 1)[1].strip()
                ).user_id
            except AccessTokenError:
                actor_user_id = None

        path_parts = [part for part in request.url.path.split("/") if part]
        target_type = path_parts[2] if len(path_parts) > 2 else "api"

        try:
            async with AsyncSessionFactory() as session:
                AuditService(session).add(
                    action=f"http.{request.method.lower()}",
                    actor_user_id=actor_user_id,
                    target_type=target_type,
                    target_id=request.url.path,
                    request_id=request_id,
                    ip_address=get_client_ip(request),
                    user_agent=request.headers.get("user-agent"),
                    status_code=status_code,
                    details={
                        "method": request.method,
                        "path": request.url.path,
                        "query": request.url.query,
                    },
                )
                await session.commit()
        except Exception:
            logger.exception("Could not write audit log for %s", request.url.path)