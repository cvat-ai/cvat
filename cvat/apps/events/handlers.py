# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import traceback
from typing import Any, Optional, Union

import rq
from crum import get_current_request, get_current_user
from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.views import exception_handler

from cvat.apps.engine.models import (
    CloudStorage,
    Comment,
    Issue,
    Job,
    Label,
    Project,
    ShapeType,
    Task,
    User,
)
from cvat.apps.engine.rq_job_handler import RQJobMetaField
from cvat.apps.engine.serializers import (
    BasicUserSerializer,
    CloudStorageReadSerializer,
    CommentReadSerializer,
    IssueReadSerializer,
    JobReadSerializer,
    LabelSerializer,
    ProjectReadSerializer,
    TaskReadSerializer,
)
from cvat.apps.organizations.models import Invitation, Membership, Organization
from cvat.apps.organizations.serializers import (
    InvitationReadSerializer,
    MembershipReadSerializer,
    OrganizationReadSerializer,
)
from cvat.apps.webhooks.models import Webhook
from cvat.apps.webhooks.serializers import WebhookReadSerializer

from .cache import get_cache
from .const import WORKING_TIME_RESOLUTION, WORKING_TIME_SCOPE
from .event import event_scope, record_server_event
from .utils import compute_working_time_per_ids


def project_id(instance):
    if isinstance(instance, Project):
        return instance.id

    try:
        pid = getattr(instance, "project_id", None)
        if pid is None:
            return instance.get_project_id()
        return pid
    except Exception:
        return None


def organization_id(instance):
    if isinstance(instance, Organization):
        return instance.id

    try:
        return getattr(instance, "organization_id", None)
    except Exception:
        return None


def task_id(instance):
    if isinstance(instance, Task):
        return instance.id

    try:
        tid = getattr(instance, "task_id", None)
        if tid is None:
            return instance.get_task_id()
        return tid
    except Exception:
        return None


def job_id(instance):
    if isinstance(instance, Job):
        return instance.id

    try:
        jid = getattr(instance, "job_id", None)
        if jid is None:
            return instance.get_job_id()
        return jid
    except Exception:
        return None


def get_user(instance=None):
    # Try to get current user from request
    user = get_current_user()
    if user is not None:
        return user

    # Try to get user from rq_job
    if isinstance(instance, rq.job.Job):
        return instance.meta.get(RQJobMetaField.USER, None)
    else:
        rq_job = rq.get_current_job()
        if rq_job:
            return rq_job.meta.get(RQJobMetaField.USER, None)

    if isinstance(instance, User):
        return instance

    return None


def get_request(instance=None):
    request = get_current_request()
    if request is not None:
        return request

    if isinstance(instance, rq.job.Job):
        return instance.meta.get(RQJobMetaField.REQUEST, None)
    else:
        rq_job = rq.get_current_job()
        if rq_job:
            return rq_job.meta.get(RQJobMetaField.REQUEST, None)

    return None


def _get_value(obj, key):
    if obj is not None:
        if isinstance(obj, dict):
            return obj.get(key, None)
        return getattr(obj, key, None)

    return None


def request_id(instance=None):
    request = get_request(instance)
    return _get_value(request, "uuid")


def user_id(instance=None):
    current_user = get_user(instance)
    return _get_value(current_user, "id")


def user_name(instance=None):
    current_user = get_user(instance)
    return _get_value(current_user, "username")


def user_email(instance=None):
    current_user = get_user(instance)
    return _get_value(current_user, "email") or None


def organization_slug(instance):
    if isinstance(instance, Organization):
        return instance.slug

    try:
        org = getattr(instance, "organization", None)
        if org is None:
            return instance.get_organization_slug()
        return org.slug
    except Exception:
        return None


def get_instance_diff(old_data, data):
    ignore_related_fields = ("labels",)
    diff = {}
    for prop, value in data.items():
        if prop in ignore_related_fields:
            continue
        old_value = old_data.get(prop)
        if old_value != value:
            diff[prop] = {
                "old_value": old_value,
                "new_value": value,
            }

    return diff


def _cleanup_fields(obj: dict[str, Any]) -> dict[str, Any]:
    fields = (
        "slug",
        "id",
        "name",
        "username",
        "display_name",
        "message",
        "organization",
        "project",
        "size",
        "task",
        "tasks",
        "job",
        "jobs",
        "comments",
        "url",
        "issues",
        "attributes",
        "key",
    )
    subfields = ("url",)

    data = {}
    for k, v in obj.items():
        if k in fields:
            continue
        if isinstance(v, dict):
            data[k] = {kk: vv for kk, vv in v.items() if kk not in subfields}
        else:
            data[k] = v
    return data


def _get_object_name(instance):
    if (
        isinstance(instance, Organization)
        or isinstance(instance, Project)
        or isinstance(instance, Task)
        or isinstance(instance, Job)
        or isinstance(instance, Label)
    ):
        return getattr(instance, "name", None)

    if isinstance(instance, User):
        return getattr(instance, "username", None)

    if isinstance(instance, CloudStorage):
        return getattr(instance, "display_name", None)

    if isinstance(instance, Comment):
        return getattr(instance, "message", None)

    return None


SERIALIZERS = [
    (Organization, OrganizationReadSerializer),
    (Project, ProjectReadSerializer),
    (Task, TaskReadSerializer),
    (Job, JobReadSerializer),
    (User, BasicUserSerializer),
    (CloudStorage, CloudStorageReadSerializer),
    (Issue, IssueReadSerializer),
    (Comment, CommentReadSerializer),
    (Label, LabelSerializer),
    (Membership, MembershipReadSerializer),
    (Invitation, InvitationReadSerializer),
    (Webhook, WebhookReadSerializer),
]


def get_serializer(instance):
    context = {"request": get_current_request()}

    serializer = None
    for model, serializer_class in SERIALIZERS:
        if isinstance(instance, model):
            serializer = serializer_class(instance=instance, context=context)

    return serializer


def get_serializer_without_url(instance):
    serializer = get_serializer(instance)
    if serializer:
        serializer.fields.pop("url", None)
    return serializer


def handle_create(scope, instance, **kwargs):
    oid = organization_id(instance)
    oslug = organization_slug(instance)
    pid = project_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = user_id(instance)
    uname = user_name(instance)
    uemail = user_email(instance)

    serializer = get_serializer_without_url(instance=instance)
    try:
        payload = serializer.data
    except Exception:
        payload = {}

    payload = _cleanup_fields(obj=payload)
    record_server_event(
        scope=scope,
        request_id=request_id(),
        on_commit=True,
        obj_id=getattr(instance, "id", None),
        obj_name=_get_object_name(instance),
        org_id=oid,
        org_slug=oslug,
        project_id=pid,
        task_id=tid,
        job_id=jid,
        user_id=uid,
        user_name=uname,
        user_email=uemail,
        payload=payload,
    )


def handle_update(scope, instance, old_instance, **kwargs):
    oid = organization_id(instance)
    oslug = organization_slug(instance)
    pid = project_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = user_id(instance)
    uname = user_name(instance)
    uemail = user_email(instance)

    old_serializer = get_serializer_without_url(instance=old_instance)
    serializer = get_serializer_without_url(instance=instance)
    diff = get_instance_diff(old_data=old_serializer.data, data=serializer.data)

    for prop, change in diff.items():
        change = _cleanup_fields(change)
        record_server_event(
            scope=scope,
            request_id=request_id(),
            on_commit=True,
            obj_name=prop,
            obj_id=getattr(instance, f"{prop}_id", None),
            obj_val=str(change["new_value"]),
            org_id=oid,
            org_slug=oslug,
            project_id=pid,
            task_id=tid,
            job_id=jid,
            user_id=uid,
            user_name=uname,
            user_email=uemail,
            payload={"old_value": change["old_value"]},
        )


def handle_delete(scope, instance, store_in_deletion_cache=False, **kwargs):
    deletion_cache = get_cache()
    instance_id = getattr(instance, "id", None)
    if store_in_deletion_cache:
        deletion_cache.set(
            instance.__class__,
            instance_id,
            {
                "oid": organization_id(instance),
                "oslug": organization_slug(instance),
                "pid": project_id(instance),
                "tid": task_id(instance),
                "jid": job_id(instance),
            },
        )
        return

    instance_meta_info = deletion_cache.pop(instance.__class__, instance_id)
    if instance_meta_info:
        oid = instance_meta_info["oid"]
        oslug = instance_meta_info["oslug"]
        pid = instance_meta_info["pid"]
        tid = instance_meta_info["tid"]
        jid = instance_meta_info["jid"]
    else:
        oid = organization_id(instance)
        oslug = organization_slug(instance)
        pid = project_id(instance)
        tid = task_id(instance)
        jid = job_id(instance)

    uid = user_id(instance)
    uname = user_name(instance)
    uemail = user_email(instance)

    record_server_event(
        scope=scope,
        request_id=request_id(),
        on_commit=True,
        obj_id=instance_id,
        obj_name=_get_object_name(instance),
        org_id=oid,
        org_slug=oslug,
        project_id=pid,
        task_id=tid,
        job_id=jid,
        user_id=uid,
        user_name=uname,
        user_email=uemail,
    )


def handle_annotations_change(instance, annotations, action, **kwargs):
    def filter_data(data):
        filtered_data = {
            "id": data["id"],
        }

        return filtered_data

    def filter_track(track):
        filtered_data = filter_data(track)
        filtered_data["shapes"] = [filter_data(s) for s in track["shapes"]]
        return filtered_data

    oid = organization_id(instance)
    oslug = organization_slug(instance)
    pid = project_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = user_id(instance)
    uname = user_name(instance)
    uemail = user_email(instance)

    tags = [filter_data(tag) for tag in annotations.get("tags", [])]
    if tags:
        record_server_event(
            scope=event_scope(action, "tags"),
            request_id=request_id(),
            on_commit=True,
            count=len(tags),
            org_id=oid,
            org_slug=oslug,
            project_id=pid,
            task_id=tid,
            job_id=jid,
            user_id=uid,
            user_name=uname,
            user_email=uemail,
            payload={"tags": tags},
        )

    shapes_by_type = {shape_type[0]: [] for shape_type in ShapeType.choices()}
    for shape in annotations.get("shapes", []):
        shapes_by_type[shape["type"]].append(filter_data(shape))

    scope = event_scope(action, "shapes")
    for shape_type, shapes in shapes_by_type.items():
        if shapes:
            record_server_event(
                scope=scope,
                request_id=request_id(),
                on_commit=True,
                obj_name=shape_type,
                count=len(shapes),
                org_id=oid,
                org_slug=oslug,
                project_id=pid,
                task_id=tid,
                job_id=jid,
                user_id=uid,
                user_name=uname,
                user_email=uemail,
                payload={"shapes": shapes},
            )

    tracks_by_type = {shape_type[0]: [] for shape_type in ShapeType.choices()}
    for track in annotations.get("tracks", []):
        filtered_track = filter_track(track)
        tracks_by_type[track["shapes"][0]["type"]].append(filtered_track)

    scope = event_scope(action, "tracks")
    for track_type, tracks in tracks_by_type.items():
        if tracks:
            record_server_event(
                scope=scope,
                request_id=request_id(),
                on_commit=True,
                obj_name=track_type,
                count=len(tracks),
                org_id=oid,
                org_slug=oslug,
                project_id=pid,
                task_id=tid,
                job_id=jid,
                user_id=uid,
                user_name=uname,
                user_email=uemail,
                payload={"tracks": tracks},
            )


def handle_dataset_io(
    instance: Union[Project, Task, Job],
    action: str,
    *,
    format_name: str,
    cloud_storage_id: Optional[int],
    **payload_fields,
) -> None:
    payload = {"format": format_name, **payload_fields}

    if cloud_storage_id:
        payload["cloud_storage"] = {"id": cloud_storage_id}

    record_server_event(
        scope=event_scope(action, "dataset"),
        request_id=request_id(),
        org_id=organization_id(instance),
        org_slug=organization_slug(instance),
        project_id=project_id(instance),
        task_id=task_id(instance),
        job_id=job_id(instance),
        user_id=user_id(instance),
        user_name=user_name(instance),
        user_email=user_email(instance),
        payload=payload,
    )


def handle_dataset_export(
    instance: Union[Project, Task, Job],
    *,
    format_name: str,
    cloud_storage_id: Optional[int],
    save_images: bool,
) -> None:
    handle_dataset_io(
        instance,
        "export",
        format_name=format_name,
        cloud_storage_id=cloud_storage_id,
        save_images=save_images,
    )


def handle_dataset_import(
    instance: Union[Project, Task, Job],
    *,
    format_name: str,
    cloud_storage_id: Optional[int],
) -> None:
    handle_dataset_io(
        instance, "import", format_name=format_name, cloud_storage_id=cloud_storage_id
    )


def handle_function_call(
    function_id: str,
    target: Union[Task, Job],
    **payload_fields,
) -> None:
    record_server_event(
        scope=event_scope("call", "function"),
        request_id=request_id(),
        project_id=project_id(target),
        task_id=task_id(target),
        job_id=job_id(target),
        user_id=user_id(),
        user_name=user_name(),
        user_email=user_email(),
        payload={
            "function": {"id": function_id},
            **payload_fields,
        },
    )


def handle_rq_exception(rq_job, exc_type, exc_value, tb):
    oid = rq_job.meta.get(RQJobMetaField.ORG_ID, None)
    oslug = rq_job.meta.get(RQJobMetaField.ORG_SLUG, None)
    pid = rq_job.meta.get(RQJobMetaField.PROJECT_ID, None)
    tid = rq_job.meta.get(RQJobMetaField.TASK_ID, None)
    jid = rq_job.meta.get(RQJobMetaField.JOB_ID, None)
    uid = user_id(rq_job)
    uname = user_name(rq_job)
    uemail = user_email(rq_job)
    tb_strings = traceback.format_exception(exc_type, exc_value, tb)

    payload = {
        "message": tb_strings[-1].rstrip("\n"),
        "stack": "".join(tb_strings),
    }

    record_server_event(
        scope="send:exception",
        request_id=request_id(instance=rq_job),
        count=1,
        org_id=oid,
        org_slug=oslug,
        project_id=pid,
        task_id=tid,
        job_id=jid,
        user_id=uid,
        user_name=uname,
        user_email=uemail,
        payload=payload,
    )

    return False


def handle_viewset_exception(exc, context):
    response = exception_handler(exc, context)

    IGNORED_EXCEPTION_CLASSES = (NotAuthenticated,)
    if isinstance(exc, IGNORED_EXCEPTION_CLASSES):
        return response
    # the standard DRF exception handler only handle APIException, Http404 and PermissionDenied
    # exceptions types, any other will cause a 500 error
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if response is not None:
        status_code = response.status_code
    request = context["request"]
    view = context["view"]

    tb_strings = traceback.format_exception(type(exc), exc, exc.__traceback__)

    payload = {
        "basename": getattr(view, "basename", None),
        "action": getattr(view, "action", None),
        "request": {
            "url": request.get_full_path(),
            "query_params": request.query_params,
            "content_type": request.content_type,
            "method": request.method,
        },
        "message": tb_strings[-1].rstrip("\n"),
        "stack": "".join(tb_strings),
        "status_code": status_code,
    }

    record_server_event(
        scope="send:exception",
        request_id=request_id(),
        count=1,
        user_id=getattr(request.user, "id", None),
        user_name=getattr(request.user, "username", None),
        user_email=getattr(request.user, "email", None),
        payload=payload,
    )

    return response


def handle_client_events_push(request, data: dict):
    org = request.iam_context["organization"]

    working_time_per_ids = compute_working_time_per_ids(data)

    if data["events"]:
        common = {
            "user_id": request.user.id,
            "user_name": request.user.username,
            "user_email": request.user.email or None,
            "org_id": getattr(org, "id", None),
            "org_slug": getattr(org, "slug", None),
        }

        for ids, working_time in working_time_per_ids.items():
            job_id, task_id, project_id = ids
            if working_time["value"].total_seconds():
                value = working_time["value"] // WORKING_TIME_RESOLUTION
                record_server_event(
                    scope=WORKING_TIME_SCOPE,
                    request_id=request_id(),
                    # keep it in payload for backward compatibility
                    # but in the future it is much better to use a "duration" field
                    # because parsing JSON in SQL query is very slow
                    payload={"working_time": value},
                    timestamp=str(working_time["timestamp"].timestamp()),
                    duration=value,
                    project_id=project_id,
                    task_id=task_id,
                    job_id=job_id,
                    count=1,
                    **common,
                )
