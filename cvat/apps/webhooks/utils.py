# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import hmac
import json
from copy import copy
from http import HTTPStatus
from typing import TypeVar

import requests
from django.db.models import Model

from cvat.apps.consensus.rq import ConsensusRequestId
from cvat.apps.engine.models import (
    Comment,
    Issue,
    Job,
    Project,
    RequestAction,
    RequestSubresource,
    RequestTarget,
    Task,
)
from cvat.apps.engine.rq import ExportRequestId, ImportRequestId
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.organizations.models import Invitation, Membership, Organization
from cvat.apps.quality_control.rq import QualityRequestId
from cvat.apps.webhooks.schemas import EventGroupDTO
from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS, make_requests_session

from .models import Webhook

_WEBHOOK_TIMEOUT = (3, 10)
_RESPONSE_SIZE_LIMIT = 1 * 1024 * 1024  # 1 MB

ModelT = TypeVar("ModelT", bound=Model)

REQUEST_COMPLETION_RESOURCES: tuple[tuple[str, EventGroupDTO], ...] = (
    (
        "request[{}]".format(
            ExportRequestId(
                target=RequestTarget.TASK,
                target_id=1,
                subresource=RequestSubresource.ANNOTATIONS,
            ).type
        ),
        EventGroupDTO(display_name="Dataset export"),
    ),
    (
        "request[{}]".format(
            ExportRequestId(
                target=RequestTarget.TASK,
                target_id=1,
                subresource=RequestSubresource.DATASET,
            ).type
        ),
        EventGroupDTO(display_name="Dataset export"),
    ),
    (
        "request[{}]".format(
            ExportRequestId(
                target=RequestTarget.TASK,
                target_id=1,
                subresource=RequestSubresource.BACKUP,
            ).type
        ),
        EventGroupDTO(display_name="Backup export"),
    ),
    (
        "request[{}]".format(
            ImportRequestId(
                action=RequestAction.CREATE,
                target=RequestTarget.TASK,
                target_id=1,
            ).type
        ),
        EventGroupDTO(display_name="Task data creation"),
    ),
    (
        f"request[{ConsensusRequestId(target=RequestTarget.TASK, target_id=1).type}]",
        EventGroupDTO(display_name="Consensus merge"),
    ),
    (
        f"request[{ConsensusRequestId(target=RequestTarget.JOB, target_id=1).type}]",
        EventGroupDTO(display_name="Consensus merge"),
    ),
    (
        f"request[{QualityRequestId(target=RequestTarget.TASK, target_id=1).type}]",
        EventGroupDTO(display_name="Quality report creation"),
    ),
)


def retrieve_instance(model: type[ModelT], pk: int) -> ModelT:
    """Return an instance loaded the same way as the corresponding retrieve endpoint"""

    # NOTE @sosov:
    # Webhook payloads are serialized with the same read serializers as REST retrieve
    # responses. Some of those serializers depend on fields loaded or annotated by the
    # viewset retrieve querysets, such as task job-summary counts and job issue/replica
    # counts. Reusing the same relation loading and queryset annotations here keeps
    # webhook create/update payloads consistent with API retrieve responses and avoids
    # extra queries for related objects used by the serializers.

    if model is Project:
        return (
            Project.objects.select_related(
                "owner",
                "assignee",
                "organization",
                "annotation_guide",
                "source_storage",
                "target_storage",
            )
            .prefetch_related("tasks")
            .get(pk=pk)
        )

    if model is Task:
        return (
            Task.objects.select_related("data")
            .select_related(
                "target_storage",
                "source_storage",
                "annotation_guide",
                "assignee",
                "owner",
            )
            .with_job_summary()
            .get(pk=pk)
        )

    if model is Job:
        return (
            Job.objects.select_related(
                "segment__task",
                "segment__task__project",
            )
            .select_related("segment__task__data")
            .select_related(
                "assignee",
                "segment__task__annotation_guide",
                "segment__task__project__annotation_guide",
            )
            .with_issue_counts()
            .with_child_jobs_counts()
            .get(pk=pk)
        )

    if model is Issue:
        return Issue.objects.prefetch_related("job__segment__task", "owner", "assignee", "job").get(
            pk=pk
        )

    if model is Comment:
        return Comment.objects.prefetch_related("issue", "issue__job", "owner").get(pk=pk)

    if model is Organization:
        return Organization.objects.select_related("owner").get(pk=pk)

    if model is Invitation:
        return Invitation.objects.select_related(
            "owner", "membership__user", "membership__organization"
        ).get(pk=pk)

    if model is Membership:
        return Membership.objects.select_related("invitation", "user").get(pk=pk)

    raise ValueError(f"Unsupported model: {model}")


def get_sender(instance) -> dict:
    from cvat.apps.events.handlers import get_request, get_user

    user = get_user(instance)
    if isinstance(user, dict):
        return user

    return BasicUserSerializer(user, context={"request": get_request(instance)}).data


def perform_webhook_request(webhook: Webhook, payload: dict) -> tuple[int, str]:
    try:
        headers: dict[str, str] = {}
        if webhook.secret:
            headers["X-Signature-256"] = (
                "sha256="
                + hmac.new(
                    webhook.secret.encode("utf-8"),
                    json.dumps(payload).encode("utf-8"),
                    digestmod=hashlib.sha256,
                ).hexdigest()
            )

        with make_requests_session() as session:
            response = session.post(
                webhook.target_url,
                json=payload,
                verify=webhook.enable_ssl,
                headers=headers,
                timeout=_WEBHOOK_TIMEOUT,
                stream=True,
                proxies=PROXIES_FOR_UNTRUSTED_URLS,
            )
            status_code = response.status_code
            response_body = response.raw.read(_RESPONSE_SIZE_LIMIT + 1, decode_content=True)

        response = ""
        if response_body is not None and len(response_body) < _RESPONSE_SIZE_LIMIT + 1:
            response = response_body.decode("utf-8", errors="replace")

        return status_code, response
    except requests.ConnectionError as ex:
        return HTTPStatus.BAD_GATEWAY, str(ex)
    except requests.Timeout as ex:
        return HTTPStatus.GATEWAY_TIMEOUT, str(ex)


def recreate_old_instance(instance: ModelT, dirty_fields: dict) -> ModelT:
    """Return a copy of the instance with dirty fields reverted to their previous values"""

    old_instance = copy(instance)
    for field, value in dirty_fields.items():
        setattr(old_instance, field, value["saved"])

    return old_instance
