# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import cast

from django.conf import settings
from rest_framework.exceptions import PermissionDenied, ValidationError

from cvat.apps.engine.models import Job, Project, Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

from .models import ConsensusSettings


class ConsensusMergePermission(OpenPolicyAgentPermission):
    task_id: int | None

    class Scopes(StrEnum):
        CREATE = "create"

    @classmethod
    def create(cls, request: ExtendedRequest, view, obj, iam_context):
        Scopes = cls.Scopes

        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            if scope == Scopes.CREATE:
                # FUTURE-FIXME: use serializers for validation
                task_id = request.data.get("task_id")
                job_id = request.data.get("job_id")

                if not (task_id or job_id):
                    raise PermissionDenied("Either task_id or job_id must be specified")

                # merge is always at least at the task level, even for specific jobs
                if task_id is not None or job_id is not None:
                    if job_id:
                        try:
                            job = Job.objects.select_related("segment").get(id=job_id)
                        except Job.DoesNotExist:
                            raise ValidationError("The specified job does not exist")

                        task_id = job.get_task_id()

                    # The request may have a different org or org unset
                    # Here we need to retrieve iam_context for this user, based on the task_id
                    try:
                        task = Task.objects.get(id=task_id)
                    except Task.DoesNotExist:
                        raise ValidationError("The specified task does not exist")

                    iam_context = get_iam_context(request, task)

                permissions.append(
                    cls.create_base_perm(
                        request,
                        view,
                        scope,
                        iam_context,
                        obj,
                        task_id=task_id,
                    )
                )

            else:
                permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/consensus_merges/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "create": Scopes.CREATE,
            }[view.action]
        ]

    def get_resource(self):
        data = None

        if self.scope == self.Scopes.CREATE:
            task: Task | None = None
            project: Project | None = None

            if self.scope == self.Scopes.CREATE and self.task_id:
                try:
                    task = Task.objects.get(id=self.task_id)
                except Task.DoesNotExist:
                    raise ValidationError("The specified task does not exist")

            if task and task.project:
                project = task.project
                organization_id = task.project.organization_id
            else:
                organization_id = task.organization_id

            data = {
                "organization": {"id": organization_id},
                "task": (
                    {
                        "owner": {"id": task.owner_id},
                        "assignee": {"id": task.assignee_id},
                    }
                    if task
                    else None
                ),
                "project": (
                    {
                        "owner": {"id": project.owner_id},
                        "assignee": {"id": project.assignee_id},
                    }
                    if project
                    else None
                ),
            }

        return data


class ConsensusSettingPermission(OpenPolicyAgentPermission):
    obj: ConsensusSettings | None

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = cls.Scopes

        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            if scope in [Scopes.VIEW, Scopes.UPDATE]:
                obj = cast(ConsensusSettings, obj)

                if scope == Scopes.VIEW:
                    task_scope = TaskPermission.Scopes.VIEW
                elif scope == Scopes.UPDATE:
                    task_scope = TaskPermission.Scopes.UPDATE_DESC
                else:
                    assert False

                # Access rights are the same as in the owning task
                # This component doesn't define its own rules in this case
                permissions.append(
                    TaskPermission.create_base_perm(
                        request,
                        view,
                        iam_context=iam_context,
                        scope=task_scope,
                        obj=obj.task,
                    )
                )
            elif scope == cls.Scopes.LIST:
                if task_id := request.query_params.get("task_id", None):
                    permissions.append(
                        TaskPermission.create_scope_view(
                            request,
                            int(task_id),
                            iam_context=iam_context,
                        )
                    )

                permissions.append(cls.create_scope_list(request, iam_context))
            else:
                permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/consensus_settings/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "partial_update": Scopes.UPDATE,
            }[view.action]
        ]

    def get_resource(self):
        data = None

        if self.obj:
            task = self.obj.task
            if task.project:
                organization_id = task.project.organization_id
            else:
                organization_id = task.organization_id

            data = {
                "id": self.obj.id,
                "organization": {"id": organization_id},
                "task": (
                    {
                        "owner": {"id": task.owner_id},
                        "assignee": {"id": task.assignee_id},
                    }
                    if task
                    else None
                ),
                "project": (
                    {
                        "owner": {"id": task.project.owner_id},
                        "assignee": {"id": task.project.assignee_id},
                    }
                    if task.project
                    else None
                ),
            }

        return data
