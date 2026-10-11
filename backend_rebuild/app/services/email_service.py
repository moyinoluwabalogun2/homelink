from __future__ import annotations

import asyncio
from email.message import EmailMessage
from html import escape
import smtplib
import ssl
from urllib.parse import urlencode

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
            "/reset-password?"
            + urlencode(
                {
                    "token": raw_token,
                }
            )
        )

        subject = (
            "Reset your HomeLink password"
        )

        safe_name = (
            recipient_name.strip()
            or "HomeLink member"
        )

        text_content = (
            f"Hello {safe_name},\n\n"
            "A password reset was requested for "
            "your HomeLink account.\n\n"
            "Use the secure link below to choose "
            "a new password:\n\n"
            f"{reset_url}\n\n"
            "This link expires in "
            f"{settings.password_reset_expire_minutes} "
            "minutes and can only be used once.\n\n"
            "If you did not request this password "
            "reset, you can safely ignore this email. "
            "Your current password will remain unchanged.\n\n"
            "HomeLink\n"
            "Living around OOU, made simpler."
        )

        escaped_name = escape(
            safe_name
        )

        escaped_url = escape(
            reset_url,
            quote=True,
        )

        html_content = f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    >
    <title>Reset your HomeLink password</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background: #f4f2ed;
      color: #122033;
      font-family: Arial, Helvetica, sans-serif;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background: #f4f2ed;"
    >
      <tr>
        <td
          align="center"
          style="padding: 38px 16px;"
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width: 100%;
              max-width: 600px;
              overflow: hidden;
              border: 1px solid #dedcd5;
              border-radius: 18px;
              background: #ffffff;
              box-shadow: 0 18px 55px rgba(18, 32, 51, 0.08);
            "
          >
            <tr>
              <td
                style="
                  padding: 28px 34px;
                  background: #122033;
                "
              >
                <div
                  style="
                    color: #ffffff;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                  "
                >
                  HomeLink
                </div>

                <div
                  style="
                    margin-top: 5px;
                    color: #aebde8;
                    font-size: 12px;
                  "
                >
                  Living around OOU, made simpler.
                </div>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding: 38px 34px 34px;
                "
              >
                <div
                  style="
                    margin-bottom: 13px;
                    color: #1f5eff;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                  "
                >
                  Account security
                </div>

                <h1
                  style="
                    margin: 0;
                    color: #122033;
                    font-size: 31px;
                    line-height: 1.12;
                    letter-spacing: -1px;
                  "
                >
                  Reset your password
                </h1>

                <p
                  style="
                    margin: 22px 0 0;
                    color: #4f5b6b;
                    font-size: 15px;
                    line-height: 1.7;
                  "
                >
                  Hello {escaped_name},
                </p>

                <p
                  style="
                    margin: 13px 0 0;
                    color: #4f5b6b;
                    font-size: 15px;
                    line-height: 1.7;
                  "
                >
                  A password reset was requested for your
                  HomeLink account. Use the secure button
                  below to choose a new password.
                </p>

                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="margin-top: 28px;"
                >
                  <tr>
                    <td
                      style="
                        border-radius: 9px;
                        background: #1f5eff;
                      "
                    >
                      <a
                        href="{escaped_url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                          display: inline-block;
                          padding: 15px 24px;
                          color: #ffffff;
                          font-size: 14px;
                          font-weight: 700;
                          text-decoration: none;
                        "
                      >
                        Reset password
                      </a>
                    </td>
                  </tr>
                </table>

                <div
                  style="
                    margin-top: 28px;
                    padding: 17px 18px;
                    border: 1px solid #e1e5ec;
                    border-radius: 10px;
                    background: #faf9f6;
                  "
                >
                  <p
                    style="
                      margin: 0;
                      color: #667281;
                      font-size: 13px;
                      line-height: 1.65;
                    "
                  >
                    This link expires in
                    <strong
                      style="color: #122033;"
                    >
                      {settings.password_reset_expire_minutes}
                      minutes
                    </strong>
                    and can only be used once.
                  </p>
                </div>

                <p
                  style="
                    margin: 24px 0 0;
                    color: #737f8f;
                    font-size: 13px;
                    line-height: 1.65;
                  "
                >
                  If you did not request this reset, you can
                  safely ignore this email. Your current
                  password will remain unchanged.
                </p>

                <p
                  style="
                    margin: 24px 0 0;
                    color: #8a939d;
                    font-size: 11px;
                    line-height: 1.65;
                    overflow-wrap: anywhere;
                  "
                >
                  If the button does not work, copy and paste
                  this address into your browser:<br>
                  <a
                    href="{escaped_url}"
                    style="color: #1f5eff;"
                  >
                    {escaped_url}
                  </a>
                </p>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding: 20px 34px;
                  border-top: 1px solid #ebe9e3;
                  color: #8a939d;
                  background: #faf9f6;
                  font-size: 11px;
                  line-height: 1.6;
                "
              >
                This automated security email was sent by
                HomeLink. Please do not share the reset link
                with anyone.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

        await self._deliver(
            recipient_email=(
                recipient_email
            ),
            subject=subject,
            text_content=text_content,
            html_content=html_content,
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
            "/verify-email?"
            + urlencode(
                {
                    "token": raw_token,
                }
            )
        )

        safe_name = (
            recipient_name.strip()
            or "HomeLink member"
        )

        subject = (
            "Verify your HomeLink email"
        )

        text_content = (
            f"Hello {safe_name},\n\n"
            "Verify the email address associated "
            "with your HomeLink account:\n\n"
            f"{verification_url}\n\n"
            "This link expires in "
            f"{settings.email_verification_expire_minutes} "
            "minutes.\n\n"
            "If you did not create this account, "
            "you can safely ignore this message.\n\n"
            "HomeLink"
        )

        await self._deliver(
            recipient_email=(
                recipient_email
            ),
            subject=subject,
            text_content=text_content,
        )

    async def _deliver(
        self,
        *,
        recipient_email: str,
        subject: str,
        text_content: str,
        html_content: str | None = None,
    ) -> None:
        if not all(
            [
                settings.smtp_host,
                settings.smtp_username,
                settings.smtp_password,
                settings.smtp_from_email,
            ]
        ):
            raise EmailDeliveryError(
                "Email delivery is not configured."
            )

        await asyncio.to_thread(
            self._send_smtp_message,
            recipient_email,
            subject,
            text_content,
            html_content,
        )

    @staticmethod
    def _send_smtp_message(
        recipient_email: str,
        subject: str,
        text_content: str,
        html_content: str | None,
    ) -> None:
        if not all(
            [
                settings.smtp_host,
                settings.smtp_username,
                settings.smtp_password,
                settings.smtp_from_email,
            ]
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
        message["To"] = (
            recipient_email
        )

        message.set_content(
            text_content,
        )

        if html_content:
            message.add_alternative(
                html_content,
                subtype="html",
            )

        context = (
            ssl.create_default_context()
        )

        try:
            if settings.smtp_use_ssl:
                with smtplib.SMTP_SSL(
                    settings.smtp_host,
                    settings.smtp_port,
                    context=context,
                    timeout=20,
                ) as client:
                    EmailService._authenticate(
                        client
                    )

                    client.send_message(
                        message
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
                    client
                )

                client.send_message(
                    message
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
            not settings.smtp_username
            or not settings.smtp_password
        ):
            raise EmailDeliveryError(
                "SMTP authentication is incomplete."
            )

        try:
            client.login(
                settings.smtp_username,
                settings.smtp_password,
            )

        except smtplib.SMTPException as exc:
            raise EmailDeliveryError(
                "SMTP authentication failed."
            ) from exc