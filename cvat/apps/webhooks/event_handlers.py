# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from typing import Any

from django.dispatch import receiver
from rq.job import Job as RQJob

from cvat.apps.consensus.rq import ConsensusRequestId
from cvat.apps.engine.rq import BaseRQMeta, ExportRequestId, ImportRequestId, RequestId
from cvat.apps.quality_control.rq import QualityRequestId
from cvat.apps.redis_handler.signals import request_failed, request_succeeded
from cvat.apps.redis_handler.utils import RequestStatusEnum
from cvat.apps.webhooks import services, utils
from cvat.apps.webhooks.dispatch import batch_add_to_queue


@receiver(request_succeeded)
@receiver(request_failed)
def enqueue_request_completion_webhooks(
    sender: Any,
    rq_job: RQJob,
    status: RequestStatusEnum,
    message: str | None,
    **kwargs,
) -> None:
    from cvat.apps.events.export import TARGET as events_export_TARGET

    request_id, _queue = RequestId.parse(rq_job.id, try_legacy_format=True)

    match request_id:
        case ExportRequestId():
            if request_id.target == events_export_TARGET:
                # NOTE @sosov: We do not send webhooks for events export request
                return

            event_name, webhook_payload = (
                utils.get_event_name_and_webhook_payload_from_export_request(
                    request=request_id,
                    status=status,
                    message=message,
                )
            )

        case ImportRequestId():
            event_name, webhook_payload = (
                utils.get_event_name_and_webhook_payload_from_import_request(
                    request=request_id,
                    status=status,
                    message=message,
                )
            )

        case QualityRequestId():
            event_name, webhook_payload = (
                utils.get_event_name_and_webhook_payload_from_quality_request(
                    request=request_id,
                    status=status,
                    message=message,
                )
            )

        case ConsensusRequestId():
            event_name, webhook_payload = (
                utils.get_event_name_and_webhook_payload_from_consensus_requests(
                    request=request_id,
                    status=status,
                    message=message,
                )
            )

        case _:
            raise ValueError(f"Unexpected request type: {type(request_id).__name__}")

    rq_meta = BaseRQMeta.for_job(rq_job)

    webhooks = services.select_webhooks(
        event=event_name,
        organization_id=rq_meta.org_id,
        project_id=rq_meta.project_id,
    )

    if not webhooks:
        return

    batch_add_to_queue(
        webhooks=webhooks,
        data=webhook_payload,
    )
