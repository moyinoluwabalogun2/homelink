from app.core.asyncio_compat import run_async
from app.db.session import AsyncSessionFactory
from app.services.maintenance_service import MaintenanceService


async def run_maintenance() -> None:
    async with AsyncSessionFactory() as session:
        result = await MaintenanceService(session).run()
    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    run_async(run_maintenance())