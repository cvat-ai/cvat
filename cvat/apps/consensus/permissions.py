# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Optional, Union, cast

from django.conf import settings
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Job, Project, Task
from cvat.apps.engine.permissions import JobPermission, TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

from .models import AssigneeConsensusReport, ConsensusConflict, ConsensusReport, ConsensusSettings


class ConsensusReportPermission(OpenPolicyAgentPermission):
    obj: Optional[ConsensusReport]
    rq_job_owner_id: Optional[int]
    job_id: Optional[int]
    task_id: Optional[int]

    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"
        VIEW = "view"
        VIEW_STATUS = "view:status"

    @classmethod
    def create_scope_check_status(cls, request, job_owner_id: int, iam_context=None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)
        return cls(**iam_context, scope=cls.Scopes.VIEW_STATUS, job_owner_id=job_owner_id)

    @classmethod
    def create_scope_view(cls, request, report: Union[int, ConsensusReport], iam_context=None):
        if isinstance(report, int):
            try:
                report = ConsensusReport.objects.get(id=report)
            except ConsensusReport.DoesNotExist as ex:
                raise ValidationError(str(ex))

        # Access rights are the same as in the owning task
        # This component doesn't define its own rules in this case
        return TaskPermission.create_scope_view(
            request,
            task=report.get_task(),
            iam_context=iam_context,
        )

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == "consensus_reports":
            for scope in cls.get_scopes(request, view, obj):
                if scope == Scopes.VIEW:
                    permissions.append(cls.create_scope_view(request, obj, iam_context=iam_context))
                elif scope == Scopes.LIST and isinstance(obj, Task):
                    permissions.append(TaskPermission.create_scope_view(request, task=obj))
                elif scope == Scopes.CREATE:
                    job_id = None
                    task_id = None

                    if request.data.get("task_id"):
                        # TODO: refactor duplicated code

                        task_id = request.data.get("task_id")

                        # The request may have a different org or org unset
                        # Here we need to retrieve iam_context for this user, based on the task_id
                        try:
                            task = Task.objects.get(id=task_id)
                        except Task.DoesNotExist:
                            raise ValidationError("The specified task does not exist")

                        iam_context = get_iam_context(request, task)

                        permissions.append(
                            TaskPermission.create_scope_view(request, task, iam_context=iam_context)
                        )
                    elif request.data.get("job_id"):
                        job_id = request.data.get("job_id")

                        # The request may have a different org or org unset
                        # Here we need to retrieve iam_context for this user, based on the task_id
                        try:
                            job = Job.objects.get(id=job_id)
                        except JobPermission.DoesNotExist:
                            raise ValidationError("The specified job does not exist")

                        iam_context = get_iam_context(request, job)

                        permissions.append(
                            JobPermission.create_scope_view(request, job, iam_context=iam_context)
                        )

                    permissions.append(
                        cls.create_base_perm(
                            request,
                            view,
                            scope,
                            iam_context,
                            obj,
                            task_id=task_id,
                            job_id=job_id,
                        )
                    )
                else:
                    permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        if "job_owner_id" in kwargs:
            self.rq_job_owner_id = int(kwargs.pop("job_owner_id"))

        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/consensus_reports/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "create": Scopes.CREATE,
                "retrieve": Scopes.VIEW,
                "data": Scopes.VIEW,
            }[view.action]
        ]

    def get_resource(self):
        data = None

        if self.obj or self.scope == self.Scopes.CREATE:
            job: Optional[Job] = None
            task: Optional[Task] = None
            project: Optional[Project] = None
            obj_id: Optional[int] = None

            if self.obj:
                obj_id = self.obj.id
                job = self.obj.job
                task = self.obj.get_task()
            elif self.scope == self.Scopes.CREATE:
                if self.job_id:
                    try:
                        job = Job.objects.get(id=self.job_id)
                    except Job.DoesNotExist:
                        raise ValidationError("The specified job does not exist")

                    self.task_id = job.get_task_id()

                if self.task_id:
                    try:
                        task = Task.objects.get(id=self.task_id)
                    except Task.DoesNotExist:
                        raise ValidationError("The specified task does not exist")
                else:
                    assert False


            if task and task.project_id:
                project = task.project
                organization = project.organization
            else:
                organization = getattr(task, "organization", None)

            data = {
                "id": obj_id,
                "organization": {"id": getattr(organization, "id", None)},
                "job": (
                    {
                        "assignee": {"id": getattr(job.assignee, "id", None)},
                    }
                    if job
                    else None
                ),
                "task": (
                    {
                        "owner": {"id": getattr(task.owner, "id", None)},
                        "assignee": {"id": getattr(task.assignee, "id", None)},
                    }
                    if task
                    else None
                ),
                "project": (
                    {
                        "owner": {"id": getattr(project.owner, "id", None)},
                        "assignee": {"id": getattr(project.assignee, "id", None)},
                    }
                    if project
                    else None
                ),
            }
        elif self.scope == self.Scopes.VIEW_STATUS:
            data = {"owner": {"id": self.rq_job_owner_id}}

        return data


class ConsensusConflictPermission(OpenPolicyAgentPermission):
    obj: Optional[ConsensusConflict]

    class Scopes(StrEnum):
        LIST = "list"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == "consensus_conflicts":
            for scope in cls.get_scopes(request, view, obj):
                if scope == cls.Scopes.LIST and isinstance(obj, ConsensusReport):
                    permissions.append(
                        ConsensusReportPermission.create_scope_view(
                            request,
                            obj,
                            iam_context=iam_context,
                        )
                    )
                else:
                    permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/consensus_conflicts/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
            }[view.action]
        ]

    def get_resource(self):
        return None


class ConsensusSettingPermission(OpenPolicyAgentPermission):
    obj: Optional[ConsensusSettings]

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
                organization = task.project.organization
            else:
                organization = task.organization

            data = {
                "id": self.obj.id,
                "organization": {"id": getattr(organization, "id", None)},
                "task": (
                    {
                        "owner": {"id": getattr(task.owner, "id", None)},
                        "assignee": {"id": getattr(task.assignee, "id", None)},
                    }
                    if task
                    else None
                ),
                "project": (
                    {
                        "owner": {"id": getattr(task.project.owner, "id", None)},
                        "assignee": {"id": getattr(task.project.assignee, "id", None)},
                    }
                    if task.project
                    else None
                ),
            }

        return data


class AssigneeConsensusReportPermission(OpenPolicyAgentPermission):
    obj: Optional[AssigneeConsensusReport]
    job_owner_id: Optional[int]

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"

    @classmethod
    def create_scope_check_status(cls, request, job_owner_id: int, iam_context=None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)
        return cls(**iam_context, scope="view:status", job_owner_id=job_owner_id)

    @classmethod
    def create_scope_view(
        cls, request, report: Union[int, AssigneeConsensusReport], iam_context=None
    ):
        if isinstance(report, int):
            try:
                report = AssigneeConsensusReport.objects.get(id=report)
            except AssigneeConsensusReport.DoesNotExist as ex:
                raise ValidationError(str(ex))

        # Access rights are the same as in the owning task
        # This component doesn't define its own rules in this case
        return TaskPermission.create_scope_view(
            request,
            task=report.get_task(),
            iam_context=iam_context,
        )

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == "assignee_consensus_reports":
            for scope in cls.get_scopes(request, view, obj):
                if scope == Scopes.VIEW:
                    permissions.append(cls.create_scope_view(request, obj, iam_context=iam_context))
                elif scope == Scopes.LIST and isinstance(obj, Task):
                    permissions.append(TaskPermission.create_scope_view(request, task=obj))
                else:
                    permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        if "job_owner_id" in kwargs:
            self.job_owner_id = int(kwargs.pop("job_owner_id"))

        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/assignee_consensus_reports/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "data": Scopes.VIEW,
            }[view.action]
        ]

    def get_resource(self):
        data = None

        if self.obj:
            task = self.obj.get_task()
            if task.project:
                organization = task.project.organization
            else:
                organization = task.organization

            data = {
                "id": self.obj.id,
                "organization": {"id": getattr(organization, "id", None)},
                "task": (
                    {
                        "owner": {"id": getattr(task.owner, "id", None)},
                        "assignee": {"id": getattr(task.assignee, "id", None)},
                    }
                    if task
                    else None
                ),
                "project": (
                    {
                        "owner": {"id": getattr(task.project.owner, "id", None)},
                        "assignee": {"id": getattr(task.project.assignee, "id", None)},
                    }
                    if task.project
                    else None
                ),
            }

        return data
