from __future__ import annotations

from functools import lru_cache
from ipaddress import ip_address
from typing import Literal
from urllib.parse import urlparse

from pydantic import (
    field_validator,
    model_validator,
)

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


Environment = Literal[
    "development",
    "test",
    "staging",
    "production",
]


PaymentProvider = Literal[
    "disabled",
    "mock",
    "paystack",
    "flutterwave",
    "both",
]


LOCAL_HOSTS = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
}


def get_hostname(
    value: str,
) -> str:
    return (
        urlparse(
            value
        ).hostname
        or ""
    ).lower()


def is_local_hostname(
    hostname: str,
) -> bool:
    normalized = (
        hostname
        .strip()
        .lower()
        .strip("[]")
    )

    if normalized in LOCAL_HOSTS:
        return True

    try:
        address = ip_address(
            normalized
        )

    except ValueError:
        return False

    return (
        address.is_loopback
        or address.is_private
        or address.is_link_local
    )


def uses_https(
    value: str,
) -> bool:
    return (
        urlparse(
            value
        ).scheme.lower()
        == "https"
    )


def normalize_origin(
    value: str,
) -> str:
    return (
        value
        .strip()
        .rstrip("/")
    )


class Settings(
    BaseSettings,
):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # =========================================================
    # APPLICATION
    # =========================================================

    app_name: str = "HomeLink API"
    app_version: str = "1.0.0"

    environment: Environment = (
        "development"
    )

    debug: bool = False
    log_level: str = "INFO"

    api_v1_prefix: str = (
        "/api/v1"
    )

    frontend_url: str = (
        "http://localhost:3000"
    )

    backend_public_url: str = (
        "http://127.0.0.1:8001"
    )

    # =========================================================
    # DATABASE / REDIS
    # =========================================================

    database_url: str = (
        "postgresql+psycopg://"
        "homelink:homelink@"
        "localhost:5432/homelink"
    )

    sql_echo: bool = False

    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_timeout_seconds: int = 5
    db_pool_recycle_seconds: int = 300
    db_connect_timeout_seconds: int = 10
    db_statement_timeout_ms: int = 15_000

    redis_url: str = (
        "redis://localhost:6379/0"
    )

    redis_max_connections: int = 20
    redis_connect_timeout_seconds: int = 3
    redis_socket_timeout_seconds: int = 5
    redis_health_check_interval_seconds: int = 30

    # =========================================================
    # REQUEST CAPACITY
    # =========================================================

    max_request_body_bytes: int = 1_048_576

    # =========================================================
    # AUTHENTICATION / SECURITY
    # =========================================================

    secret_key: str = (
        "change-me-before-production"
    )

    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "homelink-api"
    jwt_audience: str = "homelink-web"

    jwt_leeway_seconds: int = 10

    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    password_reset_expire_minutes: int = 30

    email_verification_expire_minutes: int = 60
    email_verification_required: bool = False

    refresh_cookie_name: str = (
        "homelink_refresh_token"
    )

    refresh_cookie_path: str = (
        "/api/v1/auth"
    )

    refresh_cookie_secure: bool = False

    refresh_cookie_samesite: Literal[
        "lax",
        "strict",
        "none",
    ] = "lax"

    refresh_cookie_domain: (
        str | None
    ) = None

    login_max_failures: int = 5
    login_lock_minutes: int = 15

    force_reset_after_failures: int = 10

    # =========================================================
    # LEGAL
    # =========================================================

    terms_version: str = (
        "2026-09-24"
    )

    privacy_version: str = (
        "2026-09-24"
    )

    legal_effective_date: str = (
        "2026-09-24"
    )

    legal_contact_email: str = (
        "homelink814@gmail.com"
    )

    company_legal_name: str = (
        "HomeLink"
    )

    legal_documents_are_drafts: bool = True

    # =========================================================
    # EMAIL / SMTP
    # =========================================================

    smtp_host: (
        str | None
    ) = None

    smtp_port: int = 587

    smtp_username: (
        str | None
    ) = None

    smtp_password: (
        str | None
    ) = None

    smtp_from_email: (
        str | None
    ) = None

    smtp_from_name: str = (
        "HomeLink"
    )

    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False

    # =========================================================
    # PROXY / CORS / TRUSTED HOSTS
    # =========================================================

    trust_proxy_headers: bool = False

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    allowed_hosts: list[str] = [
        "localhost",
        "127.0.0.1",
        "testserver",
    ]

    # =========================================================
    # FREE LISTING ALLOWANCES
    # =========================================================

    free_marketplace_listings: int = 1
    free_rental_listings: int = 1
    free_buy_property_listings: int = 1

    # =========================================================
    # PAYMENTS
    # =========================================================

    payment_provider: PaymentProvider = (
        "mock"
    )

    payment_callback_url: str = (
        "http://localhost:3000/"
        "payment/callback"
    )

    # -------------------------
    # PAYSTACK
    # -------------------------

    paystack_mode: Literal[
        "test",
        "live",
    ] = "test"

    paystack_public_key: (
        str | None
    ) = None

    paystack_secret_key: (
        str | None
    ) = None

    paystack_base_url: str = (
        "https://api.paystack.co"
    )

    # -------------------------
    # FLUTTERWAVE
    # -------------------------

    flutterwave_mode: Literal[
        "test",
        "live",
    ] = "test"

    flutterwave_secret_key: (
        str | None
    ) = None

    flutterwave_webhook_secret: (
        str | None
    ) = None

    flutterwave_base_url: str = (
        "https://api.flutterwave.com/v3"
    )

    # =========================================================
    # CLOUDINARY
    # =========================================================

    cloudinary_enabled: bool = False

    cloudinary_cloud_name: (
        str | None
    ) = None

    cloudinary_api_key: (
        str | None
    ) = None

    cloudinary_api_secret: (
        str | None
    ) = None

    cloudinary_upload_folder: str = (
        "homelink"
    )

    # =========================================================
    # RETENTION / CLEANUP
    # =========================================================

    session_cleanup_grace_days: int = 7

    token_cleanup_retention_days: int = 7

    read_notification_retention_days: int = 180

    agent_document_retention_days: int = 30

    webhook_event_retention_days: int = 90

    audit_log_retention_days: int = 365

    # =========================================================
    # NORMALIZATION
    # =========================================================

    @field_validator(
        "frontend_url",
        "backend_public_url",
        "payment_callback_url",
        "paystack_base_url",
        "flutterwave_base_url",
        mode="before",
    )
    @classmethod
    def normalize_urls(
        cls,
        value: object,
    ) -> object:
        if isinstance(
            value,
            str,
        ):
            return (
                value
                .strip()
                .rstrip("/")
            )

        return value

    @field_validator(
        "refresh_cookie_domain",
        "smtp_host",
        "smtp_username",
        "smtp_password",
        "smtp_from_email",
        "paystack_public_key",
        "paystack_secret_key",
        "flutterwave_secret_key",
        "flutterwave_webhook_secret",
        "cloudinary_cloud_name",
        "cloudinary_api_key",
        "cloudinary_api_secret",
        mode="before",
    )
    @classmethod
    def blank_to_none(
        cls,
        value: object,
    ) -> object:
        if (
            isinstance(
                value,
                str,
            )
            and not value.strip()
        ):
            return None

        if isinstance(
            value,
            str,
        ):
            return value.strip()

        return value

    @field_validator(
        "cors_origins",
        mode="after",
    )
    @classmethod
    def normalize_cors_origins(
        cls,
        values: list[str],
    ) -> list[str]:
        normalized: list[str] = []

        for value in values:
            origin = normalize_origin(
                value
            )

            if (
                origin
                and origin
                not in normalized
            ):
                normalized.append(
                    origin
                )

        return normalized

    @field_validator(
        "allowed_hosts",
        mode="after",
    )
    @classmethod
    def normalize_allowed_hosts(
        cls,
        values: list[str],
    ) -> list[str]:
        normalized: list[str] = []

        for value in values:
            host = (
                value
                .strip()
                .lower()
            )

            if (
                host
                and host
                not in normalized
            ):
                normalized.append(
                    host
                )

        return normalized

    # =========================================================
    # COMPLETE SETTINGS VALIDATION
    # =========================================================

    @model_validator(
        mode="after",
    )
    def validate_settings(
        self,
    ) -> "Settings":
        self._validate_runtime_capacity()
        self._validate_security_durations()
        self._validate_login_protection()
        self._validate_listing_allowances()
        self._validate_retention_periods()
        self._validate_cookie_security()
        self._validate_smtp()
        self._validate_payment_configuration()
        self._validate_cloudinary()

        if (
            self.environment
            == "production"
        ):
            self._validate_production()

        return self

    # =========================================================
    # CAPACITY VALIDATION
    # =========================================================

    def _validate_runtime_capacity(
        self,
    ) -> None:
        if not (
            1
            <= self.db_pool_size
            <= 50
        ):
            raise ValueError(
                "DB_POOL_SIZE must be "
                "between 1 and 50."
            )

        if not (
            0
            <= self.db_max_overflow
            <= 50
        ):
            raise ValueError(
                "DB_MAX_OVERFLOW must be "
                "between 0 and 50."
            )

        positive_settings = {
            "DB_POOL_TIMEOUT_SECONDS": (
                self.db_pool_timeout_seconds
            ),

            "DB_POOL_RECYCLE_SECONDS": (
                self.db_pool_recycle_seconds
            ),

            "DB_CONNECT_TIMEOUT_SECONDS": (
                self.db_connect_timeout_seconds
            ),

            "DB_STATEMENT_TIMEOUT_MS": (
                self.db_statement_timeout_ms
            ),

            "REDIS_MAX_CONNECTIONS": (
                self.redis_max_connections
            ),

            "REDIS_CONNECT_TIMEOUT_SECONDS": (
                self.redis_connect_timeout_seconds
            ),

            "REDIS_SOCKET_TIMEOUT_SECONDS": (
                self.redis_socket_timeout_seconds
            ),

            "REDIS_HEALTH_CHECK_INTERVAL_SECONDS": (
                self.redis_health_check_interval_seconds
            ),

            "MAX_REQUEST_BODY_BYTES": (
                self.max_request_body_bytes
            ),
        }

        for (
            name,
            value,
        ) in positive_settings.items():
            if value < 1:
                raise ValueError(
                    f"{name} must be positive."
                )

    # =========================================================
    # SECURITY VALIDATION
    # =========================================================

    def _validate_security_durations(
        self,
    ) -> None:
        if (
            self.access_token_expire_minutes
            < 1
        ):
            raise ValueError(
                "ACCESS_TOKEN_EXPIRE_MINUTES "
                "must be at least 1."
            )

        if (
            self.refresh_token_expire_days
            < 1
        ):
            raise ValueError(
                "REFRESH_TOKEN_EXPIRE_DAYS "
                "must be at least 1."
            )

        if (
            self.password_reset_expire_minutes
            < 5
        ):
            raise ValueError(
                "PASSWORD_RESET_EXPIRE_MINUTES "
                "must be at least 5."
            )

        if (
            self.email_verification_expire_minutes
            < 5
        ):
            raise ValueError(
                "EMAIL_VERIFICATION_EXPIRE_MINUTES "
                "must be at least 5."
            )

    def _validate_login_protection(
        self,
    ) -> None:
        if (
            self.login_max_failures
            < 3
        ):
            raise ValueError(
                "LOGIN_MAX_FAILURES "
                "must be at least 3."
            )

        if (
            self.login_lock_minutes
            < 1
        ):
            raise ValueError(
                "LOGIN_LOCK_MINUTES "
                "must be at least 1."
            )

        if (
            self.force_reset_after_failures
            < self.login_max_failures
        ):
            raise ValueError(
                "FORCE_RESET_AFTER_FAILURES "
                "cannot be below "
                "LOGIN_MAX_FAILURES."
            )

    def _validate_listing_allowances(
        self,
    ) -> None:
        if min(
            self.free_marketplace_listings,
            self.free_rental_listings,
            self.free_buy_property_listings,
        ) < 0:
            raise ValueError(
                "Free listing allowances "
                "cannot be negative."
            )

    def _validate_retention_periods(
        self,
    ) -> None:
        if min(
            self.session_cleanup_grace_days,
            self.token_cleanup_retention_days,
            self.read_notification_retention_days,
            self.agent_document_retention_days,
            self.webhook_event_retention_days,
            self.audit_log_retention_days,
        ) < 1:
            raise ValueError(
                "Retention periods must "
                "be at least one day."
            )

    def _validate_cookie_security(
        self,
    ) -> None:
        if (
            self.refresh_cookie_samesite
            == "none"
            and not
            self.refresh_cookie_secure
        ):
            raise ValueError(
                "SameSite=None requires "
                "REFRESH_COOKIE_SECURE=true."
            )

        if not (
            self.refresh_cookie_path
            .startswith("/")
        ):
            raise ValueError(
                "REFRESH_COOKIE_PATH "
                "must begin with '/'."
            )

    def _validate_smtp(
        self,
    ) -> None:
        if (
            self.smtp_use_ssl
            and self.smtp_use_tls
        ):
            raise ValueError(
                "SMTP_USE_SSL and "
                "SMTP_USE_TLS cannot "
                "both be true."
            )

        if not (
            1
            <= self.smtp_port
            <= 65535
        ):
            raise ValueError(
                "SMTP_PORT must be between "
                "1 and 65535."
            )

    # =========================================================
    # PAYMENT VALIDATION
    # =========================================================

    def _validate_payment_configuration(
        self,
    ) -> None:
        if self.payment_provider in {
            "paystack",
            "both",
        }:
            self._validate_paystack()

        if self.payment_provider in {
            "flutterwave",
            "both",
        }:
            self._validate_flutterwave()

    def _validate_paystack(
        self,
    ) -> None:
        if (
            not self.paystack_public_key
            or not self.paystack_secret_key
        ):
            raise ValueError(
                "Paystack public and secret "
                "keys are required when "
                "PAYMENT_PROVIDER is "
                "'paystack' or 'both'."
            )

        expected_public_prefix = (
            "pk_test_"
            if self.paystack_mode
            == "test"
            else "pk_live_"
        )

        expected_secret_prefix = (
            "sk_test_"
            if self.paystack_mode
            == "test"
            else "sk_live_"
        )

        if not (
            self.paystack_public_key
            .startswith(
                expected_public_prefix
            )
        ):
            raise ValueError(
                "PAYSTACK_PUBLIC_KEY does "
                "not match PAYSTACK_MODE."
            )

        if not (
            self.paystack_secret_key
            .startswith(
                expected_secret_prefix
            )
        ):
            raise ValueError(
                "PAYSTACK_SECRET_KEY does "
                "not match PAYSTACK_MODE."
            )

    def _validate_flutterwave(
        self,
    ) -> None:
        if not (
            self.flutterwave_secret_key
        ):
            raise ValueError(
                "FLUTTERWAVE_SECRET_KEY is "
                "required when PAYMENT_PROVIDER "
                "is 'flutterwave' or 'both'."
            )

        if not (
            self.flutterwave_webhook_secret
        ):
            raise ValueError(
                "FLUTTERWAVE_WEBHOOK_SECRET is "
                "required when PAYMENT_PROVIDER "
                "is 'flutterwave' or 'both'."
            )

        is_test_key = (
            self.flutterwave_secret_key
            .startswith(
                "FLWSECK_TEST"
            )
        )

        if (
            self.flutterwave_mode
            == "test"
            and not is_test_key
        ):
            raise ValueError(
                "FLUTTERWAVE_SECRET_KEY "
                "does not match "
                "FLUTTERWAVE_MODE=test."
            )

        if (
            self.flutterwave_mode
            == "live"
            and is_test_key
        ):
            raise ValueError(
                "FLUTTERWAVE_SECRET_KEY "
                "does not match "
                "FLUTTERWAVE_MODE=live."
            )

    # =========================================================
    # CLOUDINARY VALIDATION
    # =========================================================

    def _validate_cloudinary(
        self,
    ) -> None:
        if not (
            self.cloudinary_enabled
        ):
            return

        if not all(
            [
                self.cloudinary_cloud_name,
                self.cloudinary_api_key,
                self.cloudinary_api_secret,
            ]
        ):
            raise ValueError(
                "Cloudinary cloud name, "
                "API key and API secret "
                "are required when "
                "CLOUDINARY_ENABLED=true."
            )

    # =========================================================
    # PRODUCTION SAFETY
    # =========================================================

    def _validate_production(
        self,
    ) -> None:
        if self.debug:
            raise ValueError(
                "DEBUG must be false "
                "in production."
            )

        if self.sql_echo:
            raise ValueError(
                "SQL_ECHO must be false "
                "in production."
            )

        if (
            len(
                self.secret_key
            ) < 48
            or self.secret_key
            == "change-me-before-production"
        ):
            raise ValueError(
                "Production SECRET_KEY "
                "must contain at least "
                "48 characters."
            )

        if (
            self.jwt_algorithm
            != "HS256"
        ):
            raise ValueError(
                "JWT_ALGORITHM must remain "
                "HS256 unless the token "
                "implementation is migrated."
            )

        if not uses_https(
            self.frontend_url
        ):
            raise ValueError(
                "FRONTEND_URL must use "
                "HTTPS in production."
            )

        if not uses_https(
            self.backend_public_url
        ):
            raise ValueError(
                "BACKEND_PUBLIC_URL must "
                "use HTTPS in production."
            )

        if not uses_https(
            self.payment_callback_url
        ):
            raise ValueError(
                "PAYMENT_CALLBACK_URL must "
                "use HTTPS in production."
            )

        frontend_origin = (
            normalize_origin(
                self.frontend_url
            )
        )

        callback = urlparse(
            self.payment_callback_url
        )

        callback_origin = (
            f"{callback.scheme}://"
            f"{callback.netloc}"
        ).rstrip("/")

        if (
            callback_origin
            != frontend_origin
        ):
            raise ValueError(
                "PAYMENT_CALLBACK_URL must "
                "use FRONTEND_URL as "
                "its origin."
            )

        if "*" in self.cors_origins:
            raise ValueError(
                "Wildcard CORS is forbidden "
                "in production."
            )

        if (
            frontend_origin
            not in self.cors_origins
        ):
            raise ValueError(
                "CORS_ORIGINS must include "
                "FRONTEND_URL."
            )

        if any(
            not uses_https(
                origin
            )
            for origin
            in self.cors_origins
        ):
            raise ValueError(
                "Every production CORS "
                "origin must use HTTPS."
            )

        if "*" in self.allowed_hosts:
            raise ValueError(
                "Wildcard ALLOWED_HOSTS "
                "is forbidden in production."
            )

        backend_host = get_hostname(
            self.backend_public_url
        )

        if (
            backend_host
            not in self.allowed_hosts
        ):
            raise ValueError(
                "ALLOWED_HOSTS must include "
                "the BACKEND_PUBLIC_URL "
                "hostname."
            )

        if not (
            self.trust_proxy_headers
        ):
            raise ValueError(
                "TRUST_PROXY_HEADERS must "
                "be true behind Render."
            )

        if not (
            self.refresh_cookie_secure
        ):
            raise ValueError(
                "REFRESH_COOKIE_SECURE must "
                "be true in production."
            )

        if (
            self.refresh_cookie_samesite
            == "none"
        ):
            raise ValueError(
                "Use "
                "REFRESH_COOKIE_SAMESITE=lax "
                "with HomeLink's same-origin "
                "authentication proxy."
            )

        if (
            self.refresh_cookie_domain
            is not None
        ):
            raise ValueError(
                "Leave REFRESH_COOKIE_DOMAIN "
                "blank when using the "
                "same-origin authentication "
                "proxy."
            )

        database_host = get_hostname(
            self.database_url
        )

        if is_local_hostname(
            database_host
        ):
            raise ValueError(
                "Production DATABASE_URL "
                "cannot use localhost or a "
                "private local address."
            )

        redis_host = get_hostname(
            self.redis_url
        )

        if is_local_hostname(
            redis_host
        ):
            raise ValueError(
                "Production REDIS_URL cannot "
                "use localhost or a private "
                "local address."
            )



        if not all(
            [
                self.smtp_host,
                self.smtp_username,
                self.smtp_password,
                self.smtp_from_email,
            ]
        ):
            raise ValueError(
                "Production SMTP host, "
                "username, password and "
                "from-email are required."
            )

        if (
            self.legal_documents_are_drafts
        ):
            raise ValueError(
                "LEGAL_DOCUMENTS_ARE_DRAFTS "
                "must be false in production."
            )

        if self.payment_provider in {
            "disabled",
            "mock",
        }:
            raise ValueError(
                "A live payment provider is "
                "required in production."
            )

        if (
            self.payment_provider in {
                "paystack",
                "both",
            }
            and self.paystack_mode
            != "live"
        ):
            raise ValueError(
                "Production Paystack "
                "payments must use live mode."
            )

        if (
            self.payment_provider in {
                "flutterwave",
                "both",
            }
            and self.flutterwave_mode
            != "live"
        ):
            raise ValueError(
                "Production Flutterwave "
                "payments must use live mode."
            )

        if not (
            self.cloudinary_enabled
        ):
            raise ValueError(
                "CLOUDINARY_ENABLED must "
                "be true in production."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()