# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Optional, Union, cast

from django.conf import settings
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

from .models import AnnotationConflict, QualityReport, QualitySettings


class QualityReportPermission(OpenPolicyAgentPermission):
    obj: Optional[QualityReport]
    job_owner_id: Optional[int]

    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"
        VIEW = "view"
        VIEW_STATUS = "view:status"

    @classmethod
    def create_scope_check_status(cls, request, job_owner_id: int, iam_context=None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)
        return cls(**iam_context, scope="view:status", job_owner_id=job_owner_id)

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
                    task_id = request.data.get("task_id")
                    if task_id is not None:
                        permissions.append(TaskPermission.create_scope_view(request, task_id))

                    permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))
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
            }.get(view.action, None)
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
        elif self.scope == self.Scopes.VIEW_STATUS:
            data = {"owner": self.job_owner_id}

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
            }.get(view.action, None)
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
