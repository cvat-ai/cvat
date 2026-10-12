# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.models import Job, LabeledShape, Task
from cvat.apps.engine.permissions import TaskPermission


class TaskClassCountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id: int):
        task = get_object_or_404(Task.objects.select_related("organization"), pk=task_id)

        if not TaskPermission.create_scope_view(request, task).check_access().allow:
            raise PermissionDenied("You do not have access to this task")

        job_ids = list(
            Job.objects.filter(segment__task_id=task_id).order_by("id").values_list("id", flat=True)
        )

        shapes = LabeledShape.objects.filter(job__segment__task_id=task_id)
        job_param = request.query_params.get("job")
        if job_param is not None:
            if not job_param.isdigit():
                raise ValidationError({"job": "A job number is expected"})
            if int(job_param) not in job_ids:
                raise NotFound(f"Job {job_param} is not part of task {task_id}")
            shapes = shapes.filter(job_id=int(job_param))

        counts = (
            shapes.values(name=F("label__name"))
            .annotate(count=Count("id"), images=Count("frame", distinct=True))
            .order_by("-count", "name")
        )

        return Response({"jobs": job_ids, "counts": list(counts)})
