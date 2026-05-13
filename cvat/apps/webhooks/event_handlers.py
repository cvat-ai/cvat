# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

import rq
from django.dispatch import receiver

from cvat.apps.dataset_manager.enums import ExportStatus
from cvat.apps.dataset_manager.signals import export_finished
from cvat.apps.engine.backup_signals import backup_finished
from cvat.apps.engine.enums import BackupStatus
from cvat.apps.engine.models import Job, Project, Task
from cvat.apps.events.handlers import organization_id as resolve_organization_id
from cvat.apps.events.handlers import project_id as resolve_project_id

from .dispatch import batch_add_to_queue
from .event_type import event_name
from .services import select_webhooks


@receiver(export_finished)
def handle_export_finished(
    sender: Any,
    target: Project | Task | Job,
    dst_format: str,
    status: ExportStatus,
    message: str = "",
    **kwargs: Any,
) -> None:
    event = event_name(action="create", resource="export")
    webhooks = select_webhooks(
        event=event,
        organization_id=resolve_organization_id(target),
        project_id=resolve_project_id(target),
    )
    if not webhooks:
        return

    rq_job = rq.get_current_job()
    payload = {
        "event": event,
        "status": status.value,
        "target": target.__class__.__name__.lower(),
        "target_id": target.id,
        "format": dst_format,
        "rq_id": rq_job.id if rq_job else None,
        "message": message,
    }
    batch_add_to_queue(webhooks=webhooks, data=payload)


@receiver(backup_finished)
def handle_backup_finished(
    sender: Any,
    target: Project | Task,
    lightweight: bool | None,
    status: BackupStatus,
    message: str = "",
    **kwargs: Any,
) -> None:
    event = event_name(action="create", resource="backup")
    webhooks = select_webhooks(
        event=event,
        organization_id=resolve_organization_id(target),
        project_id=resolve_project_id(target),
    )
    if not webhooks:
        return

    rq_job = rq.get_current_job()
    payload = {
        "event": event,
        "status": status.value,
        "target": target.__class__.__name__.lower(),
        "target_id": target.id,
        "lightweight": lightweight,
        "rq_id": rq_job.id if rq_job else None,
        "message": message,
    }
    batch_add_to_queue(webhooks=webhooks, data=payload)
