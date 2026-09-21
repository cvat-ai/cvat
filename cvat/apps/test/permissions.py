# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Permissions for the analytics test app.

We reuse existing CVAT permission infrastructure:
- If project_id is provided: check TaskPermission/ProjectPermission with "view" scope.
- If task_id is provided: check TaskPermission with "view" scope.
- If job_id is provided: check JobPermission with "view" scope.

The user must already be authenticated (enforced by the global DRF setting).
"""

from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission

from cvat.apps.engine.models import Job, Project, Task


class ClassCountPermission(BasePermission):
    """
    Grants access if the requesting user can VIEW the resource identified
    by project_id / task_id / job_id query parameter.

    This deliberately mirrors what the existing engine permissions do:
    owners, assignees, and org members with appropriate roles can read.
    """

    message = "You do not have permission to view analytics for this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        params = request.query_params

        project_id = params.get("project_id")
        task_id = params.get("task_id")
        job_id = params.get("job_id")

        try:
            if project_id is not None:
                project = get_object_or_404(Project, pk=int(project_id))
                return self._can_view_project(request, project)

            elif task_id is not None:
                task = get_object_or_404(Task, pk=int(task_id))
                return self._can_view_task(request, task)

            elif job_id is not None:
                job = get_object_or_404(
                    Job.objects.select_related("segment__task__project"),
                    pk=int(job_id),
                )
                return self._can_view_job(request, job)

            else:
                # Missing params — let the view return 400
                return True

        except (ValueError, TypeError):
            return False

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _can_view_project(self, request, project) -> bool:
        user = request.user
        if user.is_superuser:
            return True
        if project.owner_id == user.id:
            return True
        if project.assignee_id == user.id:
            return True
        # Organization membership check: if the project belongs to the org
        # the user is a member of, allow view.
        if project.organization_id is not None:
            from cvat.apps.organizations.models import Membership
            return Membership.objects.filter(
                organization_id=project.organization_id,
                user=user,
                is_active=True,
            ).exists()
        # In sandbox mode (no org): task staff can view project
        return project.is_job_staff(user.id)

    def _can_view_task(self, request, task) -> bool:
        user = request.user
        if user.is_superuser:
            return True
        if task.owner_id == user.id:
            return True
        if task.assignee_id == user.id:
            return True
        if task.organization_id is not None:
            from cvat.apps.organizations.models import Membership
            return Membership.objects.filter(
                organization_id=task.organization_id,
                user=user,
                is_active=True,
            ).exists()
        return task.is_job_staff(user.id)

    def _can_view_job(self, request, job) -> bool:
        user = request.user
        if user.is_superuser:
            return True
        task = job.segment.task
        if task.owner_id == user.id:
            return True
        if task.assignee_id == user.id:
            return True
        if job.assignee_id == user.id:
            return True
        if task.organization_id is not None:
            from cvat.apps.organizations.models import Membership
            return Membership.objects.filter(
                organization_id=task.organization_id,
                user=user,
                is_active=True,
            ).exists()
        return False
