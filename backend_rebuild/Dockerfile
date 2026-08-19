FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml ./
COPY alembic.ini ./

COPY app ./app
COPY alembic ./alembic

RUN python -m pip install --upgrade pip \
    && python -m pip install .

EXPOSE 10000

CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]