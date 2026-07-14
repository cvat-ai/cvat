# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import json
import traceback
from typing import Any

from django.dispatch import receiver
from rest_framework.renderers import JSONRenderer
from rq.job import Dependency as RQDependency
from rq.job import Job as RQJob
from rq.job import JobStatus

from cvat.apps.consensus.merging_manager import MergingManager
from cvat.apps.engine.background import BackupExporter, DatasetExporter, TaskCreator
from cvat.apps.engine.rq import ExportRQMeta, RequestId, RQMetaWithFailureInfo
from cvat.apps.quality_control.quality_reports import QualityReportRQJobManager
from cvat.apps.redis_handler.serializers import RequestSerializer
from cvat.apps.redis_handler.signals import request_failed, request_succeeded
from cvat.apps.redis_handler.utils import DetachedJob
from cvat.apps.webhooks import services
from cvat.apps.webhooks.dispatch import batch_add_to_queue
from cvat.apps.webhooks.event_type import event_key


@receiver(request_succeeded, sender=DatasetExporter)
@receiver(request_failed, sender=DatasetExporter)
@receiver(request_succeeded, sender=BackupExporter)
@receiver(request_failed, sender=BackupExporter)
@receiver(request_succeeded, sender=TaskCreator)
@receiver(request_failed, sender=TaskCreator)
@receiver(request_succeeded, sender=QualityReportRQJobManager)
@receiver(request_failed, sender=QualityReportRQJobManager)
@receiver(request_succeeded, sender=MergingManager)
@receiver(request_failed, sender=MergingManager)
def enqueue_request_completion_webhooks(
    sender: Any,
    rq_job: RQJob,
    status: JobStatus,
    result: Any | None,
    exc_type: type[BaseException] | None,
    exc_value: BaseException | None,
    exc_traceback: Any | None,
    **kwargs,
) -> None:
    request_id, _ = RequestId.parse(rq_job.id, try_legacy_format=True)

    rq_job_meta = ExportRQMeta.for_job(rq_job)

    detached_rq_job = DetachedJob.create_from_job(rq_job)
    # NOTE @sosov: This handler runs from Django signals emitted in RQ on_success/on_failure
    # callbacks via send_robust(). At this point RQ has not persisted the terminal
    # job status yet, so a successful job is still reported as "started". Since
    # send_robust() prevents receiver exceptions from changing the original job
    # outcome, the signal status is the terminal status we should expose. Webhook
    # payloads must match RequestSerializer output returned by GET /api/requests/{rq_id}
    # after completion, so serialize a detached job instead of mutating the real one.
    detached_rq_job._status = status

    if status == JobStatus.FINISHED:
        detached_rq_job._result = result

    if status == JobStatus.FAILED:
        # NOTE @sosov: RQ invokes failure callbacks before rq_exception_handler stores
        # formatted_exception that RequestSerializer is using.
        detached_rq_job_meta = RQMetaWithFailureInfo.for_job(detached_rq_job)
        detached_rq_job_meta.formatted_exception = "".join(
            traceback.format_exception_only(exc_type, exc_value)
        )

    detached_rq_job.parsed_id = request_id

    event_key_ = event_key(action="completed", resource=request_id.type)

    webhooks = services.select_webhooks(
        event_key=event_key_,
        organization_id=rq_job_meta.org_id,
        project_id=rq_job_meta.project_id,
    )

    webhook_payload = {
        "event": event_key_,
        "request": json.loads(JSONRenderer().render(RequestSerializer(detached_rq_job).data)),
    }

    if webhooks:
        batch_add_to_queue(
            webhooks=webhooks,
            data=webhook_payload,
            depends_on=RQDependency(jobs=[rq_job], allow_failure=True),
        )
