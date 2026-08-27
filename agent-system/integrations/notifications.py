"""
integrations/notifications.py — email / chat notification adapter.
Used by the scheduled check to alert on failures, overdue reviews, and budget overruns.
"""
from __future__ import annotations

import abc
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------

class NotificationAdapter(abc.ABC):

    @abc.abstractmethod
    async def send(self, subject: str, body: str, channel: str = "email") -> None:
        ...


# ---------------------------------------------------------------------------
# Stub adapter
# ---------------------------------------------------------------------------

class StubNotificationAdapter(NotificationAdapter):

    async def send(self, subject: str, body: str, channel: str = "email") -> None:
        logger.info("[STUB NOTIFICATION] [%s] %s: %s", channel.upper(), subject, body[:120])


# ---------------------------------------------------------------------------
# SendGrid email + generic webhook (Slack / Teams) adapter
# ---------------------------------------------------------------------------

class EmailWebhookNotificationAdapter(NotificationAdapter):
    """
    Sends email via SendGrid and/or posts to a webhook (Slack/Teams).
    Env vars:
      SENDGRID_API_KEY, NOTIFICATION_FROM_EMAIL, NOTIFICATION_TO_EMAIL
      NOTIFICATION_WEBHOOK_URL (optional — Slack/Teams incoming webhook)
    """

    def __init__(self) -> None:
        self._sg_key = os.environ.get("SENDGRID_API_KEY", "")
        self._from_email = os.environ.get("NOTIFICATION_FROM_EMAIL", "")
        self._to_email = os.environ.get("NOTIFICATION_TO_EMAIL", "")
        self._webhook_url = os.environ.get("NOTIFICATION_WEBHOOK_URL", "")

    async def send(self, subject: str, body: str, channel: str = "email") -> None:
        import httpx

        if channel == "email" and self._sg_key:
            await self._send_email(subject, body)
        if self._webhook_url:
            await self._send_webhook(subject, body)

    async def _send_email(self, subject: str, body: str) -> None:
        import httpx

        payload = {
            "personalizations": [{"to": [{"email": self._to_email}]}],
            "from": {"email": self._from_email},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={"Authorization": f"Bearer {self._sg_key}"},
            )
            resp.raise_for_status()
        logger.info("Email sent: %s", subject)

    async def _send_webhook(self, subject: str, body: str) -> None:
        import httpx

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                self._webhook_url,
                json={"text": f"*{subject}*\n{body}"},
            )
            resp.raise_for_status()
        logger.info("Webhook sent: %s", subject)
