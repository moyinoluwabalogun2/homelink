from fastapi import (
    APIRouter,
    Request,
)

from app.api.dependencies import (
    DbSession,
    RedisClient,
)
from app.core.rate_limit import (
    get_client_ip,
)
from app.schemas.live_statistics import (
    LiveStatisticsRead,
)
from app.services.live_statistics_service import (
    LiveStatisticsService,
)


router = APIRouter(
    prefix="/statistics",
    tags=[
        "statistics",
    ],
)


@router.get(
    "/live",
    response_model=LiveStatisticsRead,
)
async def get_live_statistics(
    request: Request,
    session: DbSession,
    redis: RedisClient,
) -> LiveStatisticsRead:
    """
    Return lightweight public HomeLink activity statistics.

    Loading this endpoint also refreshes the visitor's five-
    minute online presence.
    """

    client_ip = get_client_ip(
        request
    )

    user_agent = request.headers.get(
        "user-agent",
        "",
    )[:500]

    service = LiveStatisticsService(
        session,
        redis,
    )

    visitor_key = (
        service.create_visitor_key(
            client_ip=client_ip,
            user_agent=user_agent,
        )
    )

    return await service.get_statistics(
        visitor_key=visitor_key
    )