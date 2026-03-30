# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import cast

from django.conf import settings

from cvat.apps.engine.models import Job, Project, Task
from cvat.apps.engine.permissions import JobPermission, ProjectPermission, TaskPermission
from cvat.apps.engine.view_utils import get_or_404
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context

from .models import AnnotationConflict, QualityReport, QualityRequirement, QualitySettings
from .serializers import QualityReportCreateSerializer


def _build_quality_resource(
    obj: QualitySettings | QualityRequirement,
    *,
    resource_id: int | None = None,
) -> dict:
    settings_obj = obj.settings if isinstance(obj, QualityRequirement) else obj
    task = settings_obj.task
    project = settings_obj.project or (task.project if task else None)
    organization_id = project.organization_id if project else task.organization_id

    return {
        "id": resource_id if resource_id is not None else obj.id,
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


def _create_owning_quality_settings_permission(
    request,
    view,
    settings_obj: QualitySettings,
    *,
    scope: str,
    iam_context,
):
    if project := settings_obj.project:
        return ProjectPermission.create_base_perm(
            request,
            view,
            iam_context=iam_context,
            scope=scope,
            obj=project,
        )

    if task := settings_obj.task:
        return TaskPermission.create_base_perm(
            request,
            view,
            iam_context=iam_context,
            scope=scope,
            obj=task,
        )

    raise AssertionError("Quality settings must belong to either a task or a project")


class QualityReportPermission(OpenPolicyAgentPermission):
    obj: QualityReport | None
    rq_job_owner_id: int | None
    project: int | Project | None
    task: int | Task | None

    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"
        VIEW = "view"
        # FUTURE-TODO: deprecated scope, should be removed when related API is removed
        VIEW_STATUS = "view:status"

    @classmethod
    def create_scope_check_status(cls, request, rq_job_owner_id: int, iam_context=None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)
        return cls(**iam_context, scope=cls.Scopes.VIEW_STATUS, rq_job_owner_id=rq_job_owner_id)

    @classmethod
    def create_scope_view(cls, request, report: int | QualityReport, iam_context=None):
        if isinstance(report, int):
            report = get_or_404(QualityReport, report)

        if not iam_context and request:
            iam_context = get_iam_context(request, None)

        return cls(**iam_context, scope=cls.Scopes.VIEW, obj=report)

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = cls.Scopes

        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            if scope == Scopes.VIEW:
                permissions.append(cls.create_scope_view(request, obj, iam_context=iam_context))
            elif scope == Scopes.LIST and isinstance(obj, Job):
                permissions.append(JobPermission.create_scope_view(request, obj))
            elif scope == Scopes.LIST and isinstance(obj, Task):
                permissions.append(TaskPermission.create_scope_view(request, obj))
            elif scope == Scopes.LIST and isinstance(obj, Project):
                permissions.append(ProjectPermission.create_scope_view(request, obj))
            elif scope == Scopes.CREATE:
                # POST /api/quality/reports is used to initiate report creation
                # and to check the process status
                # FUTURE-TODO: delete after several releases
                rq_id = request.query_params.get("rq_id")

                if rq_id is not None:
                    # There will be another check for this case during request processing
                    continue

                serializer = QualityReportCreateSerializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                task_id = serializer.validated_data.get("task_id")
                project_id = serializer.validated_data.get("project_id")
                assert task_id or project_id

                if task_id is not None:
                    target = get_or_404(Task, task_id)
                    target_permission_class = TaskPermission
                elif project_id is not None:
                    target = get_or_404(Project, project_id)
                    target_permission_class = ProjectPermission

                # The request may have a different org or org unset
                # We need to retrieve iam_context based on the task or project
                iam_context = get_iam_context(request, target)

                permissions.append(
                    target_permission_class.create_scope_view(request, target, iam_context)
                )

                permissions.append(
                    cls.create_base_perm(
                        request,
                        view,
                        scope,
                        iam_context,
                        obj,
                        task=target if task_id else None,
                        project=target if project_id else None,
                    )
                )
            else:
                permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        if "rq_job_owner_id" in kwargs:
            self.rq_job_owner_id = int(kwargs.pop("rq_job_owner_id"))

        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/quality_reports/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
                "create": Scopes.CREATE,
                "retrieve": Scopes.VIEW,
                "data": Scopes.VIEW,
                "confusion": Scopes.VIEW,
            }[view.action]
        ]

    def get_resource(self):
        data = None

        if self.obj or self.scope == self.Scopes.CREATE:
            task: Task | None = None
            project: Project | None = None
            obj_id: int | None = None

            if self.obj:
                obj_id = self.obj.id
                task = self.obj.get_task()
                project = self.obj.get_project()
            elif self.scope == self.Scopes.CREATE and self.task:
                task = self.task
                if not isinstance(task, Task):
                    task = get_or_404(Task, self.task)

                project = task.project
            elif self.scope == self.Scopes.CREATE and self.project:
                project = self.project
                if not isinstance(project, Project):
                    project = get_or_404(Project, self.project)

            if project:
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
            data = {"owner": {"id": self.rq_job_owner_id}}

        return data


class AnnotationConflictPermission(OpenPolicyAgentPermission):
    obj: AnnotationConflict | None

    class Scopes(StrEnum):
        LIST = "list"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
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

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
            }[view.action]
        ]

    def get_resource(self):
        return None


class QualitySettingPermission(OpenPolicyAgentPermission):
    obj: QualitySettings | None

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"

    @classmethod
    def create_scope_view(cls, request, settings: int | QualitySettings, iam_context=None):
        if isinstance(settings, int):
            settings = get_or_404(QualitySettings, settings)

        if not iam_context and request:
            iam_context = get_iam_context(request, settings)

        return _create_owning_quality_settings_permission(
            request,
            None,
            settings,
            scope=TaskPermission.Scopes.VIEW,
            iam_context=iam_context,
        )

    @classmethod
    def create_scope_update(cls, request, settings: int | QualitySettings, iam_context=None):
        if isinstance(settings, int):
            settings = get_or_404(QualitySettings, settings)

        if not iam_context and request:
            iam_context = get_iam_context(request, settings)

        return _create_owning_quality_settings_permission(
            request,
            None,
            settings,
            scope=TaskPermission.Scopes.UPDATE_DESC,
            iam_context=iam_context,
        )

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = cls.Scopes

        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            if scope in [Scopes.VIEW, Scopes.UPDATE]:
                obj = cast(QualitySettings, obj)
                permissions.append(
                    _create_owning_quality_settings_permission(
                        request,
                        view,
                        obj,
                        scope=(
                            TaskPermission.Scopes.VIEW
                            if scope == Scopes.VIEW
                            else TaskPermission.Scopes.UPDATE_DESC
                        ),
                        iam_context=iam_context,
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
                elif project_id := request.query_params.get("project_id", None):
                    permissions.append(
                        ProjectPermission.create_scope_view(
                            request,
                            int(project_id),
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

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "list": Scopes.LIST,
                "retrieve": Scopes.VIEW,
                "update": Scopes.UPDATE,
                "partial_update": Scopes.UPDATE,
            }[view.action]
        ]

    def get_resource(self):
        if self.obj:
            return _build_quality_resource(self.obj)

        return None


class QualityRequirementPermission(OpenPolicyAgentPermission):
    obj: QualityRequirement | None
    settings: QualitySettings | None

    class Scopes(StrEnum):
        LIST = "list"
        VIEW = "view"
        CREATE = "create"
        UPDATE = "update"
        DELETE = "delete"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []

        for scope in cls.get_scopes(request, view, obj):
            if scope == cls.Scopes.LIST:
                if settings_id := request.query_params.get("settings_id", None):
                    permissions.append(
                        QualitySettingPermission.create_scope_view(
                            request,
                            int(settings_id),
                            iam_context=iam_context,
                        )
                    )
                elif task_id := request.query_params.get("task_id", None):
                    permissions.append(
                        TaskPermission.create_scope_view(
                            request,
                            int(task_id),
                            iam_context=iam_context,
                        )
                    )
                elif project_id := request.query_params.get("project_id", None):
                    permissions.append(
                        ProjectPermission.create_scope_view(
                            request,
                            int(project_id),
                            iam_context=iam_context,
                        )
                    )

                permissions.append(cls.create_scope_list(request, iam_context))
            elif scope == cls.Scopes.VIEW:
                requirement = cast(QualityRequirement, obj)
                permissions.append(
                    _create_owning_quality_settings_permission(
                        request,
                        view,
                        requirement.settings,
                        scope=TaskPermission.Scopes.VIEW,
                        iam_context=iam_context,
                    )
                )
            elif scope in [cls.Scopes.CREATE, cls.Scopes.UPDATE, cls.Scopes.DELETE]:
                if scope == cls.Scopes.CREATE:
                    settings_id = request.data.get("settings_id")
                    if settings_id is None:
                        permissions.append(cls.create_scope_list(request, iam_context))
                        continue

                    settings_obj = get_or_404(QualitySettings, int(settings_id))
                else:
                    settings_obj = cast(QualityRequirement, obj).settings

                permissions.append(
                    _create_owning_quality_settings_permission(
                        request,
                        view,
                        settings_obj,
                        scope=TaskPermission.Scopes.UPDATE_DESC,
                        iam_context=None if scope == cls.Scopes.CREATE else iam_context,
                    )
                )
            else:
                permissions.append(cls.create_base_perm(request, view, scope, iam_context, obj))

        return permissions

    def __init__(self, **kwargs):
        self.settings = kwargs.pop("settings", None)

        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/quality_settings/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return [
            {
                "list": cls.Scopes.LIST,
                "create": cls.Scopes.CREATE,
                "retrieve": cls.Scopes.VIEW,
                "update": cls.Scopes.UPDATE,
                "partial_update": cls.Scopes.UPDATE,
                "destroy": cls.Scopes.DELETE,
            }[view.action]
        ]

    def get_resource(self):
        if self.obj:
            return _build_quality_resource(self.obj)
        if self.settings:
            return _build_quality_resource(self.settings)

        return None
