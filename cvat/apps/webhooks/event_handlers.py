# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from typing import Any

from django.dispatch import receiver

from cvat.apps.engine import utils as engine_utils
from cvat.apps.engine.models import RequestTarget
from cvat.apps.engine.rq import ExportRequestId, RequestId
from cvat.apps.engine.signals import request_failed, request_succeeded
from cvat.apps.events.handlers import organization_id, project_id
from cvat.apps.webhooks import services, utils
from cvat.apps.webhooks.dispatch import batch_add_to_queue


@receiver(request_succeeded)
@receiver(request_failed)
def request_completed_event_handler(
    sender: Any,
    request_id: str,
    status: engine_utils.RequestStatusEnum,
    message: str | None,
    **kwargs,
) -> None:
    request, _queue = RequestId.parse(request_id, try_legacy_format=True)

    match request:
        case ExportRequestId():
            try:
                event_name, webhook_payload = (
                    utils.get_event_name_and_webhook_payload_from_export_request(
                        request=request,
                        status=status,
                        message=message,
                    )
                )
            # NOTE @sosov: Request completion webhooks are only implemented for
            # export of dataset / annotations and backup
            except NotImplementedError:
                return
        case _:
            # NOTE @sosov: Request completion webhooks are only implemented for
            # export of dataset / annotations and backup
            return

    target_cls = engine_utils.get_request_target_django_model_by_enum(
        target=RequestTarget(request.target)
    )
    target = target_cls.objects.get(id=request.target_id)

    webhooks = services.select_webhooks(
        event=event_name,
        organization_id=organization_id(target),
        project_id=project_id(target),
    )

    if not webhooks:
        return

    batch_add_to_queue(
        webhooks=webhooks,
        data=webhook_payload,
    )
