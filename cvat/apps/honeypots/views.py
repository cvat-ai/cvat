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
from cvat.apps.honeypots.serializers import (
    HoneypotsReportCreateSerializer,
    HoneypotsReportSummarySerializer,
)
from cvat.apps.honeypots.reports import ReportManager


@extend_schema(tags=["honeypots"])
class HoneypotsReportViewSet(
    viewsets.GenericViewSet,
    mixins.CreateModelMixin,
):
    # TODO: take from requests API

    def get_serializer_class(self):
        # a separate method is required for drf-spectacular to work
        return HoneypotsReportSummarySerializer

    @extend_schema(
        operation_id="honeypots_create_report",
        summary="Create a honeypots report",
        request=HoneypotsReportCreateSerializer(required=False),
        responses={
            "201": HoneypotsReportSummarySerializer,
            "400": OpenApiResponse(
                description="Invalid or failed request, check the response data for details"
            ),
        },
    )
    def create(self, request, *args, **kwargs):
        self.check_permissions(request)

        request_serializer = HoneypotsReportCreateSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        request_data = request_serializer.validated_data

        report_manager = ReportManager()
        report = report_manager.create_report(task_id=request_data.task_id)

        return Response(report, status=status.HTTP_200_OK)
