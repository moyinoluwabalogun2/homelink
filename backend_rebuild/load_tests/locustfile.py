from __future__ import annotations

import os
import random
from typing import Any

from locust import (
    HttpUser,
    between,
    task,
)


API_PREFIX = "/api/v1"

LOAD_TEST_EMAIL = (
    os.getenv(
        "LOAD_TEST_EMAIL",
        "",
    )
    .strip()
)

LOAD_TEST_PASSWORD = (
    os.getenv(
        "LOAD_TEST_PASSWORD",
        "",
    )
    .strip()
)

LOAD_TEST_ACCESS_TOKEN = (
    os.getenv(
        "LOAD_TEST_ACCESS_TOKEN",
        "",
    )
    .strip()
)


class PublicBrowsingUser(
    HttpUser,
):
    """
    Read-only traffic representing ordinary public visitors.
    """

    weight = 5

    wait_time = between(
        1.0,
        4.0,
    )

    def on_start(
        self,
    ) -> None:
        self.listing_ids:
          list[str] = []

        self._refresh_listing_ids()

    def _refresh_listing_ids(
        self,
    ) -> None:
        with self.client.get(
            f"{API_PREFIX}/listings",
            params={
                "limit": 24,
                "offset": 0,
            },
            name=(
                "GET /listings"
            ),
            catch_response=True,
        ) as response:
            if (
                response.status_code
                != 200
            ):
                response.failure(
                    "Expected 200, "
                    f"received {response.status_code}"
                )

                return

            try:
                records:
                  list[
                    dict[
                      str,
                      Any,
                    ]
                  ] = (
                    response.json()
                )

            except ValueError:
                response.failure(
                    "Listings response "
                    "was not valid JSON"
                )

                return

            self.listing_ids = [
                str(
                    record["id"]
                )
                for record
                in records
                if record.get(
                    "id"
                )
            ]

            response.success()

    @task(8)
    def browse_listings(
        self,
    ) -> None:
        listing_type = (
            random.choice(
                [
                    "rental",
                    "buy_property",
                    "marketplace",
                ]
            )
        )

        self.client.get(
            f"{API_PREFIX}/listings",
            params={
                "listing_type":
                    listing_type,

                "limit":
                    24,

                "offset":
                    0,
            },
            name=(
                "GET /listings?type"
            ),
        )

    @task(5)
    def open_listing(
        self,
    ) -> None:
        if not self.listing_ids:
            self._refresh_listing_ids()

            return

        listing_id = (
            random.choice(
                self.listing_ids
            )
        )

        self.client.get(
            (
                f"{API_PREFIX}"
                f"/listings/{listing_id}"
            ),
            name=(
                "GET /listings/:id"
            ),
        )

    @task(3)
    def browse_agents(
        self,
    ) -> None:
        self.client.get(
            f"{API_PREFIX}/agents",
            params={
                "limit": 24,
                "offset": 0,
            },
            name=(
                "GET /agents"
            ),
        )

    @task(2)
    def load_areas(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/locations/areas"
            ),
            name=(
                "GET /locations/areas"
            ),
        )

    @task(1)
    def readiness(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/health/ready"
            ),
            name=(
                "GET /health/ready"
            ),
        )


class AuthenticatedReadUser(
    HttpUser,
):
    """
    Optional read-only dashboard traffic using a dedicated
    test account.
    """

    abstract = not bool(
        LOAD_TEST_ACCESS_TOKEN
        or (
            LOAD_TEST_EMAIL
            and
            LOAD_TEST_PASSWORD
        )
    )

    weight = 1

    wait_time = between(
        2.0,
        6.0,
    )

    def on_start(
        self,
    ) -> None:
        if LOAD_TEST_ACCESS_TOKEN:
            self.client.headers.update(
                {
                    "Authorization": (
                        "Bearer "
                        f"{LOAD_TEST_ACCESS_TOKEN}"
                    )
                }
            )

            return

        with self.client.post(
            (
                f"{API_PREFIX}"
                "/auth/login"
            ),
            json={
                "email":
                    LOAD_TEST_EMAIL,

                "password":
                    LOAD_TEST_PASSWORD,
            },
            name=(
                "POST /auth/login"
            ),
            catch_response=True,
        ) as response:
            if (
                response.status_code
                != 200
            ):
                response.failure(
                    "Load-test login "
                    "failed with "
                    f"{response.status_code}"
                )

                return

            try:
                access_token = (
                    response.json()[
                        "access_token"
                    ]
                )

            except (
                KeyError,
                TypeError,
                ValueError,
            ):
                response.failure(
                    "Login response did "
                    "not contain a token"
                )

                return

            self.client.headers.update(
                {
                    "Authorization": (
                        "Bearer "
                        f"{access_token}"
                    )
                }
            )

            response.success()

    @task(4)
    def load_dashboard(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/dashboard/summary"
            ),
            name=(
                "GET /dashboard/summary"
            ),
        )

    @task(3)
    def load_my_listings(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/listings/mine"
            ),
            params={
                "limit": 50,
                "offset": 0,
            },
            name=(
                "GET /listings/mine"
            ),
        )

    @task(2)
    def load_credits(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/payments/credits/me"
            ),
            name=(
                "GET /payments/credits/me"
            ),
        )

    @task(2)
    def load_notifications(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/notifications"
            ),
            params={
                "limit": 20,
            },
            name=(
                "GET /notifications"
            ),
        )

    @task(1)
    def load_saved_listings(
        self,
    ) -> None:
        self.client.get(
            (
                f"{API_PREFIX}"
                "/saved-listings"
            ),
            params={
                "limit": 50,
                "offset": 0,
            },
            name=(
                "GET /saved-listings"
            ),
        )