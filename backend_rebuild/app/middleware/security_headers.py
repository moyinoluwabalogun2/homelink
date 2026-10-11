from collections.abc import MutableSequence

from starlette.types import (
    ASGIApp,
    Message,
    Receive,
    Scope,
    Send,
)


class SecurityHeadersMiddleware:
    """
    Lightweight pure-ASGI security middleware.

    It avoids BaseHTTPMiddleware so streaming responses such as
    HomeLink live events are not buffered or interrupted.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        production: bool,
    ) -> None:
        self.app = app
        self.production = production

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

        async def send_with_headers(
            message: Message,
        ) -> None:
            if (
                message["type"]
                == "http.response.start"
            ):
                headers = message.setdefault(
                    "headers",
                    [],
                )

                self._set_header(
                    headers,
                    b"x-content-type-options",
                    b"nosniff",
                )

                self._set_header(
                    headers,
                    b"x-frame-options",
                    b"DENY",
                )

                self._set_header(
                    headers,
                    b"referrer-policy",
                    (
                        b"strict-origin-"
                        b"when-cross-origin"
                    ),
                )

                self._set_header(
                    headers,
                    b"permissions-policy",
                    (
                        b"camera=(), "
                        b"microphone=(), "
                        b"geolocation=(), "
                        b"payment=(self)"
                    ),
                )

                self._set_header(
                    headers,
                    (
                        b"cross-origin-"
                        b"opener-policy"
                    ),
                    b"same-origin",
                )

                self._set_header(
                    headers,
                    (
                        b"cross-origin-"
                        b"resource-policy"
                    ),
                    b"same-site",
                )

                if self.production:
                    self._set_header(
                        headers,
                        (
                            b"strict-transport-"
                            b"security"
                        ),
                        (
                            b"max-age=31536000; "
                            b"includeSubDomains"
                        ),
                    )

            await send(message)

        await self.app(
            scope,
            receive,
            send_with_headers,
        )

    @staticmethod
    def _set_header(
        headers: MutableSequence[
            tuple[bytes, bytes]
        ],
        name: bytes,
        value: bytes,
    ) -> None:
        lowered_name = name.lower()

        for index, (
            existing_name,
            _,
        ) in enumerate(headers):
            if (
                existing_name.lower()
                == lowered_name
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