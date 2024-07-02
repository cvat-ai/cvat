# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from django.db.models import Q
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.models import Task
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.utils import get_server_url
from cvat.apps.quality_control import quality_reports as qc
from cvat.apps.quality_control.models import (
    AnnotationConflict,
    QualityReport,
    QualityReportTarget,
    QualitySettings,
)
from cvat.apps.quality_control.permissions import (
    AnnotationConflictPermission,
    QualityReportPermission,
    QualitySettingPermission,
)
from cvat.apps.quality_control.serializers import (
    AnnotationConflictSerializer,
    QualityReportCreateSerializer,
    QualityReportSerializer,
    QualitySettingsSerializer,
)

from cvat.apps.consensus.serializers import (
    ConsensusSettingsSerializer
)
from cvat.apps.consensus.models import (
    ConsensusSettings
)
from cvat.apps.consensus.permissions import (
    ConsensusSettingPermission
)
"""
engine> views.py> TaskViewSet

For now that's fine, but it should return `rq_id`

In this views.py we can get details on merge report.

storing merge report as `.json` like analytics report or quality report [prefered]
like a string only a parameter model

or somewhat like storing report attributes.

/aggregate/ => list of merge reports
/aggregate/settings/

"""


@extend_schema(tags=["consensus"])
@extend_schema_view(
    list=extend_schema(
        summary="List quality settings instances",
        responses={
            "200": ConsensusSettingsSerializer(many=True),
        },
    ),
    retrieve=extend_schema(
        summary="Get quality settings instance details",
        parameters=[
            OpenApiParameter(
                "id",
                type=OpenApiTypes.INT,
                location="path",
                description="An id of a quality settings instance",
            )
        ],
        responses={
            "200": ConsensusSettingsSerializer,
        },
    ),
    partial_update=extend_schema(
        summary="Update a quality settings instance",
        parameters=[
            OpenApiParameter(
                "id",
                type=OpenApiTypes.INT,
                location="path",
                description="An id of a quality settings instance",
            )
        ],
        request=ConsensusSettingsSerializer(partial=True),
        responses={
            "200": ConsensusSettingsSerializer,
        },
    ),
)
class ConsensusSettingsViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    PartialUpdateModelMixin,
):
    queryset = ConsensusSettings.objects.select_related("task", "task__organization").all()

    iam_organization_field = "task__organization"

    search_fields = []
    filter_fields = ["id", "task_id"]
    simple_filters = ["task_id"]
    ordering_fields = ["id"]
    ordering = "id"

    serializer_class = ConsensusSettingsSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            permissions = ConsensusSettingPermission.create_scope_list(self.request)
            queryset = permissions.filter(queryset)

        return queryset
