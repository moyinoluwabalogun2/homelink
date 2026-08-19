
from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "HomeLink API"
    app_version: str = "1.0.0"
    environment: Literal[
        "development",
        "test",
        "staging",
        "production",
    ] = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"

    database_url: str = (
        "postgresql+psycopg://homelink:homelink@localhost:5432/homelink"
    )
    sql_echo: bool = False
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me-before-production"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "homelink-api"
    jwt_audience: str = "homelink-web"
    jwt_leeway_seconds: int = 10
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    password_reset_expire_minutes: int = 30
    email_verification_expire_minutes: int = 60
    email_verification_required: bool = False

    refresh_cookie_name: str = "homelink_refresh_token"
    refresh_cookie_path: str = "/api/v1/auth"
    refresh_cookie_secure: bool = False
    refresh_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    refresh_cookie_domain: str | None = None

    login_max_failures: int = 5
    login_lock_minutes: int = 15
    force_reset_after_failures: int = 10

    terms_version: str = "2026-08-01"
    privacy_version: str = "2026-08-01"
    legal_effective_date: str = "2026-08-01"
    legal_contact_email: str = "privacy@homelink.ng"
    company_legal_name: str = "HomeLink"
    legal_documents_are_drafts: bool = True
    frontend_url: str = "http://localhost:3000"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "HomeLink"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False

    trust_proxy_headers: bool = False
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "testserver"]

    free_marketplace_listings: int = 2
    free_rental_listings: int = 1
    free_buy_property_listings: int = 1

    payment_provider: Literal["disabled", "mock", "paystack"] = "mock"
    paystack_mode: Literal["test", "live"] = "test"
    paystack_public_key: str | None = None
    paystack_secret_key: str | None = None
    paystack_base_url: str = "https://api.paystack.co"
    payment_callback_url: str = "http://localhost:3000/payment/callback"

    cloudinary_enabled: bool = False
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_upload_folder: str = "homelink"

    session_cleanup_grace_days: int = 7
    token_cleanup_retention_days: int = 7
    read_notification_retention_days: int = 180
    agent_document_retention_days: int = 30
    webhook_event_retention_days: int = 90
    audit_log_retention_days: int = 365

    @field_validator(
        "refresh_cookie_domain",
        "smtp_host",
        "smtp_username",
        "smtp_password",
        "smtp_from_email",
        "paystack_public_key",
        "paystack_secret_key",
        "cloudinary_cloud_name",
        "cloudinary_api_key",
        "cloudinary_api_secret",
        mode="before",
    )
    @classmethod
    def blank_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        if self.access_token_expire_minutes < 1:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be at least 1.")
        if self.refresh_token_expire_days < 1:
            raise ValueError("REFRESH_TOKEN_EXPIRE_DAYS must be at least 1.")
        if self.password_reset_expire_minutes < 5:
            raise ValueError("PASSWORD_RESET_EXPIRE_MINUTES must be at least 5.")
        if self.email_verification_expire_minutes < 5:
            raise ValueError("EMAIL_VERIFICATION_EXPIRE_MINUTES must be at least 5.")
        if self.login_max_failures < 3:
            raise ValueError("LOGIN_MAX_FAILURES must be at least 3.")
        if self.force_reset_after_failures < self.login_max_failures:
            raise ValueError(
                "FORCE_RESET_AFTER_FAILURES cannot be below LOGIN_MAX_FAILURES."
            )
        if min(
            self.free_marketplace_listings,
            self.free_rental_listings,
            self.free_buy_property_listings,
        ) < 0:
            raise ValueError("Free-listing allowances cannot be negative.")
        if min(
    self.session_cleanup_grace_days,
    self.token_cleanup_retention_days,
    self.read_notification_retention_days,
    self.webhook_event_retention_days,
    self.audit_log_retention_days,
    self.agent_document_retention_days,
) < 1:
            raise ValueError("Retention periods must be at least one day.")
        if self.refresh_cookie_samesite == "none" and not self.refresh_cookie_secure:
            raise ValueError("SameSite=None requires a secure cookie.")
        if self.smtp_use_ssl and self.smtp_use_tls:
            raise ValueError("SMTP_USE_SSL and SMTP_USE_TLS cannot both be true.")

        if self.payment_provider == "paystack":
            if not self.paystack_public_key or not self.paystack_secret_key:
                raise ValueError(
                    "Paystack public and secret keys are required when "
                    "PAYMENT_PROVIDER=paystack."
                )
            expected_public = "pk_test_" if self.paystack_mode == "test" else "pk_live_"
            expected_secret = "sk_test_" if self.paystack_mode == "test" else "sk_live_"
            if not self.paystack_public_key.startswith(expected_public):
                raise ValueError("PAYSTACK_PUBLIC_KEY does not match PAYSTACK_MODE.")
            if not self.paystack_secret_key.startswith(expected_secret):
                raise ValueError("PAYSTACK_SECRET_KEY does not match PAYSTACK_MODE.")

        if self.cloudinary_enabled and not all(
            [
                self.cloudinary_cloud_name,
                self.cloudinary_api_key,
                self.cloudinary_api_secret,
            ]
        ):
            raise ValueError(
                "Cloudinary cloud name, API key and API secret are required "
                "when CLOUDINARY_ENABLED=true."
            )

        if self.environment == "production":
            if len(self.secret_key) < 32 or self.secret_key == "change-me-before-production":
                raise ValueError("A strong production SECRET_KEY is required.")
            if "*" in self.cors_origins:
                raise ValueError("Wildcard CORS is not allowed in production.")
            if not self.refresh_cookie_secure:
                raise ValueError("REFRESH_COOKIE_SECURE must be true in production.")
            if not self.frontend_url.startswith("https://"):
                raise ValueError("FRONTEND_URL must use HTTPS in production.")
            if not self.email_verification_required:
                raise ValueError(
                    "EMAIL_VERIFICATION_REQUIRED must be true in production."
                )
            if not self.smtp_host or not self.smtp_from_email:
                raise ValueError(
                    "SMTP_HOST and SMTP_FROM_EMAIL are required in production."
                )
            if self.legal_documents_are_drafts:
                raise ValueError(
                    "LEGAL_DOCUMENTS_ARE_DRAFTS must be false in production."
                )
            if self.payment_provider == "mock":
                raise ValueError("Mock payments are forbidden in production.")
            if self.payment_provider == "paystack" and self.paystack_mode != "live":
                raise ValueError("Production Paystack payments must use live mode.")

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
