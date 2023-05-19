# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse
from django.db.models import Q

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema_view, extend_schema

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import Task
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.utils import get_server_url

from cvat.apps.quality_control import quality_reports as qc
from cvat.apps.quality_control.models import (
    AnnotationConflict, QualityReportTarget, QualitySettings, QualityReport
)
from cvat.apps.quality_control.serializers import (
    AnnotationConflictSerializer, QualitySettingsSerializer, QualityReportSerializer
)

from cvat.apps.iam.permissions import AnnotationConflictPermission, QualityReportPermission

from cvat.apps.profiler import silk_profile


@extend_schema(tags=["quality"])
@extend_schema_view(
    list=extend_schema(
        summary='Method returns a paginated list of annotation conflicts',
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter('task_id', type=OpenApiTypes.INT,
                description='A simple equality filter for task id'),
        ],
        responses={
            '200': AnnotationConflictSerializer(many=True),
        }),
)
class ConflictsViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = AnnotationConflict.objects.prefetch_related('report', 'annotation_ids').all()

    # NOTE: This filter works incorrectly for this view
    # it requires task__organization OR project__organization check.
    # Thus, we rely on permission-based filtering
    iam_organization_field = None

    search_fields = []
    filter_fields = list(search_fields) + [
        'id', 'report_id', 'frame', 'type', 'job_id', 'importance'
    ]
    simple_filters = set(filter_fields) - {'id'}
    lookup_fields = {
        'report_id': 'report__id',
        'job_id': 'report__job__id',
    }
    ordering_fields = list(filter_fields)
    ordering = 'id'
    serializer_class = AnnotationConflictSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == 'list':
            if task_id := self.request.GET.get('task_id', None):
                # NOTE: This filter is too complex to be implemented by other means
                task = Task.objects.get(id=task_id)
                self.check_object_permissions(self.request, task)
                queryset = queryset.filter(
                    Q(report__job__segment__task__id=task_id) | Q(report__task__id=task_id)
                )
            else:
                # In other cases permissions are checked already
                perm = AnnotationConflictPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

        return queryset


@extend_schema(tags=["quality"])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of a quality report',
        responses={
            '200': QualityReportSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of quality reports',
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter('task_id', type=OpenApiTypes.INT,
                description='A simple equality filter for task id'),
            OpenApiParameter('target', type=OpenApiTypes.STR,
                description='A simple equality filter for target'),
        ],
        responses={
            '200': QualityReportSerializer(many=True),
        }),
)
class QualityReportViewSet(viewsets.GenericViewSet,
    mixins.ListModelMixin, mixins.RetrieveModelMixin
):
    queryset = QualityReport.objects.prefetch_related(
        'job',
        'job__segment',
        'job__segment__task',
        'task',
        'task__project',
    ).all()

    # NOTE: This filter works incorrectly for this view
    # it requires task__organization OR project__organization check.
    # Thus, we rely on permission-based filtering
    iam_organization_field = None

    search_fields = []
    filter_fields = list(search_fields) + [
        'id', 'job_id', 'created_date',
        'gt_last_updated', 'target_last_updated', 'parent_id'
    ]
    simple_filters = list(set(filter_fields) - {
        'id', 'created_date', 'gt_last_updated', 'target_last_updated'
    })
    ordering_fields = list(filter_fields)
    ordering = 'id'

    def get_serializer_class(self):
        # a separate method is required for drf-spectacular to work
        return QualityReportSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == 'list':
            if task_id := self.request.GET.get('task_id', None):
                # NOTE: This filter is too complex to be implemented by other means
                task = Task.objects.get(id=task_id)
                self.check_object_permissions(self.request, task)
                queryset = queryset.filter(Q(job__segment__task__id=task_id) | Q(task__id=task_id))
            else:
                # In other cases permissions are checked already
                perm = QualityReportPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

            if target := self.request.GET.get('target', None):
                if target == QualityReportTarget.JOB:
                    queryset = queryset.filter(job__isnull=False)
                elif target == QualityReportTarget.TASK:
                    queryset = queryset.filter(task__isnull=False)
                else:
                    raise ValidationError(
                        "Unexpected 'target' filter value '{}'. Valid values are: {}".format(
                            target,
                            ', '.join(m[0] for m in QualityReportTarget.choices())
                        )
                    )

        return queryset

    @extend_schema(
        operation_id="quality_retrieve_report_data",
        summary="Retrieve full contents of the report in JSON format",
    )
    @action(detail=True, methods=['GET'], url_path='data', serializer_class=None)
    def data(self, request, pk):
        report = self.get_object() # check permissions
        json_report = qc.prepare_report_for_downloading(report, host=get_server_url(request))
        return HttpResponse(json_report.encode())

    # TODO: remove
    @extend_schema(parameters=[
        OpenApiParameter('task_id', type=OpenApiTypes.INT)
    ])
    @action(detail=False, methods=['GET'], url_path='debug', serializer_class=None)
    @silk_profile()
    def debug(self, request):
        qc.ReportUpdateManager._update_task_quality_metrics(task_id=request.GET.get('task_id'))
        return HttpResponse({})


@extend_schema(tags=["quality"])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of a quality settings',
        responses={
            '200': QualitySettingsSerializer,
        }),
)
class QualitySettingsViewSet(viewsets.GenericViewSet,
    mixins.RetrieveModelMixin, PartialUpdateModelMixin
):
    queryset = QualitySettings.objects.select_related('task').all()

    iam_organization_field = 'task__organization'

    search_fields = []
    filter_fields = []
    ordering_fields = ['id']
    ordering = 'id'

    serializer_class = QualitySettingsSerializer
