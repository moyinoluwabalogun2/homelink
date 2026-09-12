import asyncio
from email.message import EmailMessage
import smtplib
import ssl

from app.core.config import get_settings


settings = get_settings()


class EmailDeliveryError(Exception):
    pass


class EmailService:
    async def send_password_reset(
        self,
        *,
        recipient_email: str,
        recipient_name: str,
        raw_token: str,
    ) -> None:
        reset_url = (
            f"{settings.frontend_url}"
            f"/reset-password?token={raw_token}"
        )

        subject = "Reset your HomeLink password"

        text_content = (
            f"Hello {recipient_name},\n\n"
            "A password reset was requested for your "
            "HomeLink account.\n\n"
            "Reset your password here:\n"
            f"{reset_url}\n\n"
            "This link expires in "
            f"{settings.password_reset_expire_minutes} "
            "minutes.\n\n"
            "If you did not request this password reset, "
            "you can safely ignore this message.\n\n"
            "HomeLink"
        )

        await self._deliver(
            recipient_email=recipient_email,
            subject=subject,
            text_content=text_content,
        )

    async def send_email_verification(
        self,
        *,
        recipient_email: str,
        recipient_name: str,
        raw_token: str,
    ) -> None:
        verification_url = (
            f"{settings.frontend_url}"
            f"/verify-email?token={raw_token}"
        )

        subject = "Verify your HomeLink email"

        text_content = (
            f"Hello {recipient_name},\n\n"
            "Verify the email address associated with "
            "your HomeLink account.\n\n"
            "Verify your email here:\n"
            f"{verification_url}\n\n"
            "This link expires in "
            f"{settings.email_verification_expire_minutes} "
            "minutes.\n\n"
            "If you did not create this account, "
            "you can safely ignore this message.\n\n"
            "HomeLink"
        )

        await self._deliver(
            recipient_email=recipient_email,
            subject=subject,
            text_content=text_content,
        )

    async def _deliver(
        self,
        *,
        recipient_email: str,
        subject: str,
        text_content: str,
    ) -> None:
        if (
            not settings.smtp_host
            or not settings.smtp_from_email
        ):
            # Never log reset/verification URLs or raw tokens.
            raise EmailDeliveryError(
                "Email delivery is not configured."
            )

        await asyncio.to_thread(
            self._send_smtp_message,
            recipient_email,
            subject,
            text_content,
        )

    @staticmethod
    def _send_smtp_message(
        recipient_email: str,
        subject: str,
        text_content: str,
    ) -> None:
        if (
            not settings.smtp_host
            or not settings.smtp_from_email
        ):
            raise EmailDeliveryError(
                "Email configuration is incomplete."
            )

        message = EmailMessage()

        message["Subject"] = subject
        message["From"] = (
            f"{settings.smtp_from_name} "
            f"<{settings.smtp_from_email}>"
        )
        message["To"] = recipient_email

        message.set_content(
            text_content,
        )

        context = ssl.create_default_context()

        try:
            if settings.smtp_use_ssl:
                with smtplib.SMTP_SSL(
                    settings.smtp_host,
                    settings.smtp_port,
                    context=context,
                    timeout=20,
                ) as client:
                    EmailService._authenticate(
                        client,
                    )

                    client.send_message(
                        message,
                    )

                return

            with smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=20,
            ) as client:
                client.ehlo()

                if settings.smtp_use_tls:
                    client.starttls(
                        context=context,
                    )

                    client.ehlo()

                EmailService._authenticate(
                    client,
                )

                client.send_message(
                    message,
                )

        except (
            OSError,
            smtplib.SMTPException,
        ) as exc:
            raise EmailDeliveryError(
                "Email could not be delivered."
            ) from exc

    @staticmethod
    def _authenticate(
        client: smtplib.SMTP,
    ) -> None:
        if (
            settings.smtp_username
            and settings.smtp_password
        ):
            client.login(
                settings.smtp_username,
                settings.smtp_password,
            )