# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Optional, Union, cast

from django.conf import settings
from rest_framework.exceptions import PermissionDenied, ValidationError

from cvat.apps.engine.models import Project, Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

from .models import AnnotationConflict, QualityReport, QualitySettings


class QualityReportPermission(OpenPolicyAgentPermission):
    obj: Optional[QualityReport]
    job_owner_id: Optional[int]
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
    def create_scope_view(cls, request, report: Union[int, QualityReport], iam_context=None):
        if isinstance(report, int):
            try:
                report = QualityReport.objects.get(id=report)
            except QualityReport.DoesNotExist as ex:
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
        if view.basename == "quality_reports":
            for scope in cls.get_scopes(request, view, obj):
                if scope == Scopes.VIEW:
                    permissions.append(cls.create_scope_view(request, obj, iam_context=iam_context))
                elif scope == Scopes.LIST and isinstance(obj, Task):
                    permissions.append(TaskPermission.create_scope_view(request, task=obj))
                elif scope == Scopes.CREATE:
                    # Note: POST /api/quality/reports is used to initiate report creation and to check the process status
                    rq_id = request.query_params.get("rq_id")
                    task_id = request.data.get("task_id")

                    if not (task_id or rq_id):
                        raise PermissionDenied("Either task_id or rq_id must be specified")

                    if rq_id:
                        # There will be another check for this case during request processing
                        continue

                    if task_id is not None:
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
        if "job_owner_id" in kwargs:
            self.job_owner_id = int(kwargs.pop("job_owner_id"))

        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/quality_reports/allow"

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
            task: Optional[Task] = None
            project: Optional[Project] = None
            obj_id: Optional[int] = None

            if self.obj:
                obj_id = self.obj.id
                task = self.obj.get_task()
            elif self.scope == self.Scopes.CREATE and self.task_id:
                try:
                    task = Task.objects.get(id=self.task_id)
                except Task.DoesNotExist:
                    raise ValidationError("The specified task does not exist")

            if task and task.project:
                project = task.project
                organization_id = project.organization_id
            else:
                organization_id = task.organization_id

            data = {
                "id": obj_id,
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
            data = {"owner": {"id": self.job_owner_id}}

        return data


class AnnotationConflictPermission(OpenPolicyAgentPermission):
    obj: Optional[AnnotationConflict]

    class Scopes(StrEnum):
        LIST = "list"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == "annotation_conflicts":
            for scope in cls.get_scopes(request, view, obj):
                if scope == cls.Scopes.LIST and isinstance(obj, QualityReport):
                    permissions.append(
                        QualityReportPermission.create_scope_view(
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
        self.url = settings.IAM_OPA_DATA_URL + "/conflicts/allow"

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


class QualitySettingPermission(OpenPolicyAgentPermission):
    obj: Optional[QualitySettings]

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes

        permissions = []
        if view.basename == "quality_settings":
            for scope in cls.get_scopes(request, view, obj):
                if scope in [Scopes.VIEW, Scopes.UPDATE]:
                    obj = cast(QualitySettings, obj)

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
                            request, view, iam_context=iam_context, scope=task_scope, obj=obj.task
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
        self.url = settings.IAM_OPA_DATA_URL + "/quality_settings/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
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
