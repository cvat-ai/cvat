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
    rq_job_owner_id: int | None
    task_id: int | None

    class Scopes(StrEnum):
        CREATE = "create"
        VIEW_STATUS = "view:status"

    @classmethod
    def create_scope_check_status(
        cls, request: ExtendedRequest, rq_job_owner_id: int, iam_context=None
    ):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)
        return cls(**iam_context, scope=cls.Scopes.VIEW_STATUS, rq_job_owner_id=rq_job_owner_id)

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == "consensus_merges":
            for scope in cls.get_scopes(request, view, obj):
                if scope == Scopes.CREATE:
                    # Note: POST /api/consensus/merges is used to initiate report creation
                    # and to check the operation status
                    rq_id = request.query_params.get("rq_id")
                    task_id = request.data.get("task_id")
                    job_id = request.data.get("job_id")

                    if not (task_id or job_id or rq_id):
                        raise PermissionDenied(
                            "Either task_id or job_id or rq_id must be specified"
                        )

                    if rq_id:
                        # There will be another check for this case during request processing
                        continue

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
        if "rq_job_owner_id" in kwargs:
            self.rq_job_owner_id = int(kwargs.pop("rq_job_owner_id"))

        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/consensus_merges/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
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
        elif self.scope == self.Scopes.VIEW_STATUS:
            data = {"owner": {"id": self.rq_job_owner_id}}

        return data


class ConsensusSettingPermission(OpenPolicyAgentPermission):
    obj: ConsensusSettings | None

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == "consensus_settings":
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

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "partial_update": Scopes.UPDATE,
            }.get(view.action, None)
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
