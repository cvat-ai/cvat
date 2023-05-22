# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from django.http import HttpResponse
from django.db.models import Q

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter, extend_schema_view, extend_schema, OpenApiResponse
)

from rest_framework import mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound

from cvat.apps.engine.models import Task
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.utils import get_server_url

from cvat.apps.quality_control import quality_reports as qc
from cvat.apps.quality_control.models import (
    AnnotationConflict, QualityReportTarget, QualitySettings, QualityReport
)
from cvat.apps.quality_control.serializers import (
    AnnotationConflictSerializer, QualitySettingsSerializer,
    QualityReportSerializer, QualityReportCreateSerializer
)

from cvat.apps.iam.permissions import AnnotationConflictPermission, QualityReportPermission

from cvat.apps.profiler import silk_profile


@extend_schema(tags=["quality"])
@extend_schema_view(
    list=extend_schema(
        summary='Method returns a paginated list of annotation conflicts',
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter('report_id', type=OpenApiTypes.INT,
                description='A simple equality filter for report id'),
        ],
        responses={
            '200': AnnotationConflictSerializer(many=True),
        }),
)
class QualityConflictsViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = AnnotationConflict.objects.prefetch_related('report', 'annotation_ids').all()

    # NOTE: This filter works incorrectly for this view
    # it requires task__organization OR project__organization check.
    # Thus, we rely on permission-based filtering
    iam_organization_field = None

    search_fields = []
    filter_fields = list(search_fields) + [
        'id', 'frame', 'type', 'job_id', 'task_id', 'importance'
    ]
    simple_filters = set(filter_fields) - {'id'}
    lookup_fields = {
        'job_id': 'report__job__id',
        'task_id': 'report__job__segment__task__id' # task reports do not contain own conflicts
    }
    ordering_fields = list(filter_fields)
    ordering = 'id'
    serializer_class = AnnotationConflictSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == 'list':
            if report_id := self.request.GET.get('report_id', None):
                try:
                    report = QualityReport.objects.prefetch_related('parent').get(id=report_id)
                except QualityReport.DoesNotExist as ex:
                    raise NotFound(f"Report {report_id} does not exist") from ex

                if report.target == QualityReportTarget.TASK:
                    queryset = self.queryset.filter(
                        Q(report=report) | Q(report__parent=report)
                    ).distinct()
                elif report.target == QualityReportTarget.JOB:
                    queryset = self.queryset.filter(report=report)
                else:
                    assert False

            # In other cases permissions are checked already
            perm = AnnotationConflictPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset


@extend_schema(tags=["quality"])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id='quality_retrieve_report', # the default produces the plural
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
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin
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
                try:
                    task = Task.objects.get(id=task_id)
                except Task.DoesNotExist as ex:
                    raise NotFound(f"Task {task_id} does not exist") from ex

                self.check_object_permissions(self.request, task)
                queryset = queryset.filter(
                    Q(job__segment__task__id=task_id) | Q(task__id=task_id)
                ).distinct()
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

    CREATE_REPORT_RQ_ID_PARAMETER = 'rq_id'
    @extend_schema(
        operation_id="quality_create_report",
        summary="Creates a quality report asynchronously and allows to check request status",
        parameters=[
            OpenApiParameter(
                CREATE_REPORT_RQ_ID_PARAMETER,
                type=str,
                description=textwrap.dedent("""\
                    The report creation request id. Can be specified to check the report
                    creation status.
                """),
            )
        ],
        request=QualityReportCreateSerializer(required=False),
        responses={
            '201': QualityReportSerializer,
            '202': OpenApiResponse(
                OpenApiTypes.STR,
                description=textwrap.dedent("""\
                    A quality report request has been enqueued, the request id is returned.
                    The request status can be checked at this endpoint by passing the {}
                    as the query parameter. If the request id is specified, this response
                    means the quality report request is queued or is being processed.
                """.format(CREATE_REPORT_RQ_ID_PARAMETER))
            ),
            '400': OpenApiResponse(
                description="Invalid or failed request, check the response data for details"
            )
        }
    )
    def create(self, request, *args, **kwargs):
        self.check_permissions(request)

        rq_id = request.query_params.get(self.CREATE_REPORT_RQ_ID_PARAMETER, None)

        if rq_id is None:
            input_serializer = QualityReportCreateSerializer(data=request.data)
            input_serializer.is_valid(raise_exception=True)

            task_id = input_serializer.validated_data["task_id"]

            try:
                task = Task.objects.get(pk=task_id)
            except Task.DoesNotExist as ex:
                raise NotFound(f"Task {task_id} does not exist") from ex

            try:
                rq_id = qc.QualityReportUpdateManager().schedule_quality_check_job(
                    task, user_id=request.user.id
                )
                return HttpResponse(rq_id, status=status.HTTP_202_ACCEPTED)
            except qc.QualityReportUpdateManager.QualityReportsNotAvailable as ex:
                raise ValidationError(str(ex))

        else:
            report_manager = qc.QualityReportUpdateManager()
            rq_job = report_manager.get_quality_check_job(rq_id)
            if not rq_job or not QualityReportPermission.create_scope_check_status(
                request, job_owner_id=rq_job.meta["user_id"]
            ).check_access().allow:
                # We should not provide job existence information to unauthorized users
                raise NotFound("Unknown request id")

            if rq_job.is_failed:
                message = str(rq_job.exc_info)
                rq_job.delete()
                raise ValidationError(message)
            elif rq_job.is_queued or rq_job.is_started:
                return Response(status=status.HTTP_202_ACCEPTED)
            elif rq_job.is_finished:
                return_value = rq_job.return_value
                rq_job.delete()
                if not return_value:
                    raise ValidationError("No report has been computed")

                report = self.get_queryset().get(pk=return_value)
                report_serializer = QualityReportSerializer(instance=report)
                return Response(
                    data=report_serializer.data,
                    status=status.HTTP_201_CREATED,
                    headers=self.get_success_headers(report_serializer.data)
                )

    @extend_schema(
        operation_id="quality_retrieve_report_data",
        summary="Retrieve full contents of the report in JSON format",
        responses={
            '200': OpenApiTypes.OBJECT
        }
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
        qc.QualityReportUpdateManager._check_task_quality(task_id=request.GET.get('task_id'))
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
