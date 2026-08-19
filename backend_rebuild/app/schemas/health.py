from typing import Literal

from pydantic import BaseModel


class LiveHealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str


class ReadyHealthResponse(BaseModel):
    status: Literal["ready"]
    database: Literal["connected"]