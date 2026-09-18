# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import viewsets
from rest_framework.response import Response

from cvat.apps.engine.types import ExtendedRequest

from .analytics import get_class_wise_image_counts
from .permissions import ClassCountsPermission


@extend_schema(tags=["test"])
@extend_schema_view(
    list=extend_schema(
        summary="Get class-wise image counts for a task",
        parameters=[
            OpenApiParameter(
                "task_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=True,
                description="ID of the task to compute class-wise image counts for",
            ),
        ],
        responses={
            "200": OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Mapping of label name to the number of images in the "
                "task with at least one annotation of that label",
            ),
        },
    )
)
class ClassCountsViewSet(viewsets.ViewSet):
    serializer_class = None

    iam_supports_organization_params = False
    iam_permission_class = ClassCountsPermission

    def list(self, request: ExtendedRequest) -> Response:
        task_id = int(request.query_params["task_id"])
        return Response(get_class_wise_image_counts(task_id))
