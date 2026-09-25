# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import ClassCountPermission
from .serializers import ClassCountQuerySerializer, ClassCountResponseSerializer
from .service import get_class_counts


@extend_schema(tags=["analytics"])
class ClassCountView(APIView):
    """
    GET /api/test/class-counts

    Returns class-wise image counts for the specified project, task, or job.
    Exactly one of project_id, task_id, or job_id must be provided.
    """

    permission_classes = [ClassCountPermission]

    @extend_schema(
        summary="Get class-wise annotation counts",
        description=(
            "Returns per-label statistics: the number of distinct frames/images "
            "containing at least one annotation of each label, and the total "
            "annotation count. Labels with zero annotations are included. "
            "Exactly one of `project_id`, `task_id`, or `job_id` must be supplied."
        ),
        parameters=[
            OpenApiParameter(
                "project_id",
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description="Aggregate over all jobs in this project.",
            ),
            OpenApiParameter(
                "task_id",
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description="Aggregate over all jobs in this task.",
            ),
            OpenApiParameter(
                "job_id",
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description="Aggregate for this single job.",
            ),
        ],
        responses={
            200: ClassCountResponseSerializer,
            400: OpenApiResponse(description="Invalid or missing query parameters."),
            403: OpenApiResponse(description="Permission denied."),
            404: OpenApiResponse(description="Project, task, or job not found."),
        },
    )
    def get(self, request):
        # 1. Validate query params
        query_serializer = ClassCountQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        params = query_serializer.validated_data

        project_id = params.get("project_id")
        task_id = params.get("task_id")
        job_id = params.get("job_id")

        # Build scope dict for response envelope
        if project_id is not None:
            scope = {"project_id": project_id}
        elif task_id is not None:
            scope = {"task_id": task_id}
        else:
            scope = {"job_id": job_id}

        # 2. Run aggregation
        try:
            counts = get_class_counts(
                project_id=project_id,
                task_id=task_id,
                job_id=job_id,
            )
        except ValueError as exc:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            # Surface 404 naturally; re-raise others
            if isinstance(exc, Http404):
                raise
            raise

        # 3. Serialize response
        response_data = {"scope": scope, "counts": counts}
        serializer = ClassCountResponseSerializer(response_data)
        return Response(serializer.data)
