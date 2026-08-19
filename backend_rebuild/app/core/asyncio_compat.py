from __future__ import annotations

import asyncio
import selectors
import sys
from collections.abc import Awaitable
from typing import TypeVar


ResultType = TypeVar("ResultType")


def _windows_selector_loop_factory() -> asyncio.AbstractEventLoop:
    loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
    asyncio.set_event_loop(loop)
    return loop


def run_async(awaitable: Awaitable[ResultType]) -> ResultType:
    if sys.platform == "win32":
        return asyncio.run(
            awaitable,
            loop_factory=_windows_selector_loop_factory,
        )
    return asyncio.run(awaitable)

