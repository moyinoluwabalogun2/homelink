from __future__ import annotations

from starlette.types import (
    ASGIApp,
    Message,
    Receive,
    Scope,
    Send,
)


class RequestBodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    """
    Reject oversized API request bodies before they can consume
    excessive application memory.

    Listing files are uploaded directly to Cloudinary, so this
    limit applies only to the JSON/form metadata accepted by the
    HomeLink API.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        max_bytes: int,
    ) -> None:
        self.app = app
        self.max_bytes = max_bytes

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

        headers = dict(
            scope.get(
                "headers",
                [],
            )
        )

        content_length = headers.get(
            b"content-length"
        )

        if content_length is not None:
            try:
                declared_size = int(
                    content_length
                )

            except ValueError:
                await self._reject(
                    send
                )
                return

            if (
                declared_size < 0
                or declared_size
                > self.max_bytes
            ):
                await self._reject(
                    send
                )
                return

        received_bytes = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received_bytes

            message = await receive()

            if (
                message["type"]
                == "http.request"
            ):
                received_bytes += len(
                    message.get(
                        "body",
                        b"",
                    )
                )

                if (
                    received_bytes
                    > self.max_bytes
                ):
                    raise RequestBodyTooLarge

            return message

        async def tracked_send(
            message: Message,
        ) -> None:
            nonlocal response_started

            if (
                message["type"]
                == "http.response.start"
            ):
                response_started = True

            await send(
                message
            )

        try:
            await self.app(
                scope,
                limited_receive,
                tracked_send,
            )

        except RequestBodyTooLarge:
            if response_started:
                raise

            await self._reject(
                send
            )

    @staticmethod
    async def _reject(
        send: Send,
    ) -> None:
        body = (
            b'{"detail":"Request body is too large."}'
        )

        await send(
            {
                "type":
                    "http.response.start",

                "status":
                    413,

                "headers": [
                    (
                        b"content-type",
                        b"application/json",
                    ),
                    (
                        b"content-length",
                        str(
                            len(
                                body
                            )
                        ).encode(
                            "ascii"
                        ),
                    ),
                    (
                        b"cache-control",
                        b"no-store",
                    ),
                ],
            }
        )

        await send(
            {
                "type":
                    "http.response.body",

                "body":
                    body,
            }
        )