import asyncio
import selectors
import sys

from sqlalchemy import select

from app.db.session import (
    AsyncSessionFactory,
)
from app.models.user import User
from app.services.credit_service import (
    CreditService,
)


async def main() -> None:
    async with AsyncSessionFactory() as session:
        user_ids = list(
            (
                await session.scalars(
                    select(
                        User.id,
                    )
                )
            ).all()
        )

        credit_service = CreditService(
            session,
        )

        for user_id in user_ids:
            await credit_service.initialize_balances(
                user_id=user_id,
            )

        await session.commit()

        print(
            "Credit balances checked/backfilled "
            f"for {len(user_ids)} user(s)."
        )


def run() -> None:
    if sys.platform == "win32":
        asyncio.run(
            main(),
            loop_factory=lambda: asyncio.SelectorEventLoop(
                selectors.SelectSelector()
            ),
        )
    else:
        asyncio.run(
            main(),
        )


if __name__ == "__main__":
    run()