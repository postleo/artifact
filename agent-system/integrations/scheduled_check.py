"""
integrations/scheduled_check.py — cloud-scheduler-triggered endpoint.
Scans the DB for failed props, overdue reviews, and budget overruns,
then sends notifications. Invoked by Cloud Scheduler → Cloud Function / HTTP endpoint.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from config import OPTIONS_REVIEW_SLA_HOURS, SELECTION_SLA_HOURS
from store.models import PropStatus

logger = logging.getLogger(__name__)


class ScheduledCheckService:
    """
    Runs a scan across all tracked prop states and notifies on anomalies.
    Designed to be called on a schedule (e.g., every 30 minutes via Cloud Scheduler).
    """

    def __init__(self, repo: Any, notifier: Any) -> None:
        self._repo = repo
        self._notifier = notifier

    async def run(self) -> dict[str, list[str]]:
        """
        Check for:
          1. Props in any failed_* state.
          2. Props in awaiting_options_review past OPTIONS_REVIEW_SLA_HOURS.
          3. Props in selection_confirmed past SELECTION_SLA_HOURS.
          4. Props with cost.est_usd >= budget_ceiling_usd.
        Returns a summary dict for logging / API response.
        """
        issues: dict[str, list[str]] = {
            "failed": [],
            "overdue_review": [],
            "overdue_finalize": [],
            "budget_exceeded": [],
        }

        failed_statuses = [
            PropStatus.FAILED_OPTIONS,
            PropStatus.FAILED_FINAL,
            PropStatus.FAILED_EXPORT,
        ]
        for status in failed_statuses:
            props = await self._repo.list_by_status(status)
            for p in props:
                issues["failed"].append(p.id)
                await self._notifier.send(
                    subject=f"[Artifact] Prop {p.id} in {p.status.value}",
                    body=(
                        f"Prop {p.id} (project {p.project_id}) entered {p.status.value}.\n"
                        f"Brief: {p.brief.what}\n"
                        f"Last updated: {p.updated_at}"
                    ),
                )

        # Overdue options review
        sla_options = timedelta(hours=OPTIONS_REVIEW_SLA_HOURS)
        waiting = await self._repo.list_by_status(PropStatus.AWAITING_OPTIONS_REVIEW)
        for p in waiting:
            if datetime.now(timezone.utc) - p.updated_at > sla_options:
                issues["overdue_review"].append(p.id)
                await self._notifier.send(
                    subject=f"[Artifact] Overdue options review: prop {p.id}",
                    body=(
                        f"Prop {p.id} has been waiting for options review for "
                        f">{OPTIONS_REVIEW_SLA_HOURS}h.\n"
                        f"Brief: {p.brief.what}"
                    ),
                )

        # Overdue finalize start
        sla_finalize = timedelta(hours=SELECTION_SLA_HOURS)
        confirmed = await self._repo.list_by_status(PropStatus.SELECTION_CONFIRMED)
        for p in confirmed:
            if datetime.now(timezone.utc) - p.updated_at > sla_finalize:
                issues["overdue_finalize"].append(p.id)
                await self._notifier.send(
                    subject=f"[Artifact] Overdue finalize: prop {p.id}",
                    body=(
                        f"Prop {p.id} has been selection_confirmed for "
                        f">{SELECTION_SLA_HOURS}h without finalize starting.\n"
                        f"Brief: {p.brief.what}"
                    ),
                )

        # Budget exceeded
        for status in [PropStatus.BUDGET_EXCEEDED]:
            props = await self._repo.list_by_status(status)
            for p in props:
                issues["budget_exceeded"].append(p.id)
                await self._notifier.send(
                    subject=f"[Artifact] Budget exceeded: prop {p.id}",
                    body=(
                        f"Prop {p.id} has exceeded its budget ceiling of "
                        f"${p.budget_ceiling_usd:.2f}. "
                        f"Current estimate: ${p.cost.est_usd:.4f}. "
                        f"Approve budget increase to continue."
                    ),
                )

        logger.info("Scheduled check complete: %s", issues)
        return issues
