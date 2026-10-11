from datetime import datetime

from pydantic import BaseModel


class LiveStatisticsRead(
    BaseModel,
):
    total_visits: int
    people_online: int
    registered_users: int
    active_listings: int
    generated_at: datetime