# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Job, Project, Task
from cvat.apps.engine.permissions import JobPermission, ProjectPermission, TaskPermission
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum, get_iam_context


class AnalyticsReportPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        Scopes = __class__.Scopes
        permissions = []
        if view.basename == "analytics_reports":
            scopes = cls.get_scopes(request, view, obj)
            for scope in scopes:
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

            try:
                if view.action == Scopes.LIST:
                    job_id = request.query_params.get("job_id", None)
                    task_id = request.query_params.get("task_id", None)
                    project_id = request.query_params.get("project_id", None)

                    if job_id:
                        job = Job.objects.get(id=job_id)
                        iam_context = get_iam_context(request, job)
                        perm = JobPermission.create_scope_view(iam_context, int(job_id))
                        permissions.append(perm)
                else:
                    job_id = request.data.get("job_id", None)
                    task_id = request.data.get("task_id", None)
                    project_id = request.data.get("project_id", None)

                    if job_id:
                        job = Job.objects.select_related("segment__task").get(id=job_id)
                        task_id = job.segment.task.id

                if task_id:
                    task = Task.objects.get(id=task_id)
                    iam_context = get_iam_context(request, task)
                    perm = TaskPermission.create_scope_view(request, int(task_id), iam_context)
                    permissions.append(perm)

                if project_id:
                    project = Project.objects.get(id=project_id)
                    iam_context = get_iam_context(request, project)
                    perm = ProjectPermission.create_scope_view(iam_context, int(project_id))
                    permissions.append(perm)
            except ObjectDoesNotExist as ex:
                raise ValidationError(
                    "The specified resource does not exist. Please check the provided identifiers"
                ) from ex

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/analytics_reports/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "create": Scopes.CREATE,
            }.get(view.action, None)
        ]

    def get_resource(self):
        return None
