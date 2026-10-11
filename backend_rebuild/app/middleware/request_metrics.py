from __future__ import annotations

import logging
import time
from collections.abc import (
    MutableSequence,
)
from uuid import uuid4

from starlette.types import (
    ASGIApp,
    Message,
    Receive,
    Scope,
    Send,
)


logger = logging.getLogger(
    __name__
)


class RequestMetricsMiddleware:
    """
    Add correlation IDs and lightweight request timing logs.

    Query parameters, request bodies, authentication tokens and
    personal information are deliberately excluded from logs.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        slow_request_ms: int = 1_500,
    ) -> None:
        self.app = app

        self.slow_request_ms = max(
            1,
            slow_request_ms,
        )

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(
                scope,
                receive,
                send,
            )
            return

        request_id = (
            self._request_id(
                scope
            )
        )

        self._set_scope_request_id(
            scope,
            request_id,
        )

        method = str(
            scope.get(
                "method",
                "GET",
            )
        ).upper()

        # Only log the URL path. Never log query parameters.
        path = str(
            scope.get(
                "path",
                "/",
            )
        )

        started = (
            time.perf_counter()
        )

        status_code = 500

        async def send_with_metrics(
            message: Message,
        ) -> None:
            nonlocal status_code

            if (
                message["type"]
                == "http.response.start"
            ):
                status_code = int(
                    message["status"]
                )

                headers = (
                    message.setdefault(
                        "headers",
                        [],
                    )
                )

                self._set_header(
                    headers,
                    b"x-request-id",
                    request_id.encode(
                        "ascii"
                    ),
                )

            await send(
                message
            )

        try:
            await self.app(
                scope,
                receive,
                send_with_metrics,
            )

        except Exception:
            duration_ms = (
                self._duration_ms(
                    started
                )
            )

            logger.exception(
                "request_failed "
                "method=%s path=%s "
                "status=500 "
                "duration_ms=%.2f "
                "request_id=%s",
                method,
                path,
                duration_ms,
                request_id,
            )

            raise

        duration_ms = (
            self._duration_ms(
                started
            )
        )

        if status_code >= 500:
            logger.error(
                "request_server_error "
                "method=%s path=%s "
                "status=%s "
                "duration_ms=%.2f "
                "request_id=%s",
                method,
                path,
                status_code,
                duration_ms,
                request_id,
            )

        elif (
            duration_ms
            >= self.slow_request_ms
        ):
            logger.warning(
                "request_slow "
                "method=%s path=%s "
                "status=%s "
                "duration_ms=%.2f "
                "request_id=%s",
                method,
                path,
                status_code,
                duration_ms,
                request_id,
            )

        else:
            logger.info(
                "request_complete "
                "method=%s path=%s "
                "status=%s "
                "duration_ms=%.2f "
                "request_id=%s",
                method,
                path,
                status_code,
                duration_ms,
                request_id,
            )

    @staticmethod
    def _duration_ms(
        started: float,
    ) -> float:
        return (
            time.perf_counter()
            - started
        ) * 1_000

    @staticmethod
    def _request_id(
        scope: Scope,
    ) -> str:
        for (
            raw_name,
            raw_value,
        ) in scope.get(
            "headers",
            [],
        ):
            if (
                raw_name.lower()
                != b"x-request-id"
            ):
                continue

            try:
                candidate = (
                    raw_value
                    .decode("ascii")
                    .strip()
                )

            except UnicodeDecodeError:
                break

            if (
                1
                <= len(candidate)
                <= 64
                and all(
                    character.isalnum()
                    or character
                    in {
                        "-",
                        "_",
                    }
                    for character
                    in candidate
                )
            ):
                return candidate

            break

        return str(
            uuid4()
        )

    @staticmethod
    def _set_scope_request_id(
        scope: Scope,
        request_id: str,
    ) -> None:
        headers = list(
            scope.get(
                "headers",
                [],
            )
        )

        headers = [
            (
                name,
                value,
            )
            for (
                name,
                value,
            ) in headers
            if (
                name.lower()
                != b"x-request-id"
            )
        ]

        headers.append(
            (
                b"x-request-id",
                request_id.encode(
                    "ascii"
                ),
            )
        )

        scope["headers"] = headers

    @staticmethod
    def _set_header(
        headers: MutableSequence[
            tuple[
                bytes,
                bytes,
            ]
        ],
        name: bytes,
        value: bytes,
    ) -> None:
        for index, (
            existing_name,
            _,
        ) in enumerate(
            headers
        ):
            if (
                existing_name.lower()
                == name.lower()
            ):
                headers[index] = (
                    name,
                    value,
                )
                return

        headers.append(
            (
                name,
                value,
            )
        )