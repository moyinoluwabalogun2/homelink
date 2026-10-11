"""Controlled, non-destructive HTTP load smoke test for HomeLink.

Example:
    python scripts/load_smoke.py \
        --base-url https://api.example.com \
        --requests 2000 --concurrency 50

This targets only the cheap public liveness endpoint. Increase concurrency in
small steps while watching API, Postgres and Redis metrics. Do not interpret
2,000 requests as proof of 2,000 simultaneous active users.
"""

from __future__ import annotations

import argparse
import asyncio
import statistics
import time
from dataclasses import dataclass

import httpx


@dataclass(
    frozen=True
)
class Result:
    elapsed_ms: float
    status_code: int | None
    error: str | None = None


async def run_request(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
) -> Result:
    async with semaphore:
        started = (
            time.perf_counter()
        )

        try:
            response = await client.get(
                "/api/v1/health/live"
            )

            return Result(
                elapsed_ms=(
                    time.perf_counter()
                    - started
                ) * 1000,
                status_code=(
                    response.status_code
                ),
            )

        except httpx.HTTPError as exc:
            return Result(
                elapsed_ms=(
                    time.perf_counter()
                    - started
                ) * 1000,
                status_code=None,
                error=(
                    type(exc).__name__
                ),
            )


def percentile(
    values: list[float],
    quantile: float,
) -> float:
    ordered = sorted(
        values
    )

    index = min(
        len(ordered) - 1,
        int(
            len(ordered)
            * quantile
        ),
    )

    return ordered[
        index
    ]


async def main() -> int:
    parser = (
        argparse.ArgumentParser()
    )

    parser.add_argument(
        "--base-url",
        required=True,
    )

    parser.add_argument(
        "--requests",
        type=int,
        default=200,
    )

    parser.add_argument(
        "--concurrency",
        type=int,
        default=20,
    )

    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
    )

    args = parser.parse_args()

    if not (
        1
        <= args.requests
        <= 100_000
    ):
        parser.error(
            "--requests must be between "
            "1 and 100000"
        )

    if not (
        1
        <= args.concurrency
        <= 500
    ):
        parser.error(
            "--concurrency must be between "
            "1 and 500"
        )

    semaphore = asyncio.Semaphore(
        args.concurrency
    )

    timeout = httpx.Timeout(
        args.timeout
    )

    started = (
        time.perf_counter()
    )

    async with httpx.AsyncClient(
        base_url=(
            args.base_url.rstrip(
                "/"
            )
        ),
        timeout=timeout,
        follow_redirects=True,
    ) as client:
        results = await asyncio.gather(
            *(
                run_request(
                    client,
                    semaphore,
                )
                for _ in range(
                    args.requests
                )
            )
        )

    elapsed = (
        time.perf_counter()
        - started
    )

    latencies = [
        result.elapsed_ms
        for result in results
    ]

    successful = sum(
        result.status_code == 200
        for result in results
    )

    failed = (
        len(results)
        - successful
    )

    status_counts: dict[
        str,
        int,
    ] = {}

    for result in results:
        key = (
            str(
                result.status_code
            )
            if result.status_code
            else (
                result.error
                or "error"
            )
        )

        status_counts[key] = (
            status_counts.get(
                key,
                0,
            )
            + 1
        )

    print(
        f"requests={len(results)} "
        f"concurrency={args.concurrency}"
    )

    print(
        f"success={successful} "
        f"failed={failed} "
        f"duration={elapsed:.2f}s"
    )

    print(
        f"throughput="
        f"{len(results) / elapsed:.1f} "
        f"requests/second"
    )

    print(
        "latency_ms "
        f"mean={statistics.fmean(latencies):.1f} "
        f"p50={percentile(latencies, 0.50):.1f} "
        f"p95={percentile(latencies, 0.95):.1f} "
        f"p99={percentile(latencies, 0.99):.1f}"
    )

    print(
        f"statuses={status_counts}"
    )

    return (
        0
        if failed == 0
        else 1
    )


if __name__ == "__main__":
    raise SystemExit(
        asyncio.run(
            main()
        )
    )