# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from datetime import datetime

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rq.job import JobStatus as RqJobStatus

from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.models import Job, Project, Task
from cvat.apps.engine.rq import BaseRQMeta
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import get_server_url
from cvat.apps.engine.view_utils import deprecate_response, get_or_404
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
    get_iam_context,
)
from cvat.apps.quality_control.serializers import (
    AnnotationConflictSerializer,
    QualityReportCreateSerializer,
    QualityReportSerializer,
    QualitySettingsParentType,
    QualitySettingsSerializer,
)
from cvat.apps.redis_handler.serializers import RqIdSerializer


@extend_schema(tags=["quality"])
@extend_schema_view(
    list=extend_schema(
        summary="List annotation conflicts in a quality report",
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter(
                "report_id",
                type=OpenApiTypes.INT,
                description="A simple equality filter for report id",
            ),
        ],
        responses={
            "200": AnnotationConflictSerializer(many=True),
        },
    ),
)
class QualityConflictsViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = AnnotationConflict.objects.prefetch_related("annotation_ids")

    iam_organization_field = [
        "report__job__segment__task__organization",
        "report__task__organization",
        "report__project__organization",
    ]
    iam_permission_class = AnnotationConflictPermission

    search_fields = []
    filter_fields = list(search_fields) + [
        "id",
        "frame",
        "type",
        "job_id",
        "task_id",
        "project_id",
        "severity",
    ]
    simple_filters = set(filter_fields) - {"id"}
    lookup_fields = {
        "job_id": "report__job__id",
        "task_id": "report__job__segment__task__id",  # task reports do not have own conflicts
        "project_id": "report__job__segment__task__project__id",  # project reports do not have own conflicts
    }
    ordering_fields = list(filter_fields)
    ordering = "-id"
    serializer_class = AnnotationConflictSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            if report_id := self.request.query_params.get("report_id", None):
                # NOTE: This filter is too complex to be implemented by other means,
                # it has a dependency on the report type
                report = get_or_404(
                    QualityReport.objects.select_related(
                        "job__segment__task__organization",
                        "task__organization",
                    ),
                    report_id,
                )
                self.check_object_permissions(self.request, report)

                if report.target == QualityReportTarget.JOB:
                    queryset = queryset.filter(report=report)
                elif report.target == QualityReportTarget.TASK:
                    # Task reports do not have own conflicts
                    queryset = queryset.filter(report__parents=report)
                elif report.target == QualityReportTarget.PROJECT:
                    # Project reports do not have own conflicts
                    queryset = queryset.filter(report__parents__parents=report)
                else:
                    assert False
            else:
                perm = AnnotationConflictPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

        return queryset


REPORT_TARGET_PARAM_NAME = "target"


@extend_schema(tags=["quality"])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id="quality_retrieve_report",  # the default produces the plural
        summary="Get quality report details",
        responses={
            "200": QualityReportSerializer,
        },
    ),
    list=extend_schema(
        summary="Method returns a paginated list of quality reports.",
        description=textwrap.dedent(
            """\
            Please note that children reports are included by default
            if the "task_id", "project_id" filters are used.
            If you want to restrict the list of results to a specific report type,
            use the "{}" parameter.

            The "parent_id" filter includes all the nested reports recursively.
            For instance, if the "parent_id" is a project report,
            all the related task and job reports will be returned.

            Please note that a report can be reused in several parent reports,
            but the "parent_id" field in responses will include only the first parent report id.
            The "parent_id" filter still returns all the relevant nested reports,
            even though the response "parent_id" values may be different from the requested one.
        """
        ).format(REPORT_TARGET_PARAM_NAME),
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter(
                "task_id", type=OpenApiTypes.INT, description="A simple equality filter for task id"
            ),
            OpenApiParameter(
                "project_id",
                type=OpenApiTypes.INT,
                description="A simple equality filter for project id",
            ),
            OpenApiParameter(
                "parent_id",
                type=OpenApiTypes.INT,
                description="A simple equality filter for parent id",
            ),
            OpenApiParameter(
                REPORT_TARGET_PARAM_NAME,
                type=OpenApiTypes.STR,
                description="A simple equality filter for target",
                enum=[v[0] for v in QualityReportTarget.choices()],
            ),
        ],
        responses={
            "200": QualityReportSerializer(many=True),
        },
    ),
)
class QualityReportViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
):
    queryset = QualityReport.objects.prefetch_related("assignee")

    iam_organization_field = [
        "job__segment__task__organization",
        "task__organization",
        "project__organization",
    ]
    iam_permission_class = QualityReportPermission

    search_fields = []
    filter_fields = list(search_fields) + [
        "id",
        "job_id",
        "task_id",
        "project_id",
        "created_date",
        "gt_last_updated",
        "target_last_updated",
    ]
    simple_filters = ["job_id"]
    ordering_fields = list(filter_fields)
    ordering = "-id"

    def get_serializer_class(self):
        # a separate method is required for drf-spectacular to work
        return QualityReportSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            iam_context = None

            # NOTE: the parent_id filter requires a different queryset
            if parent_id := self.request.query_params.get("parent_id", None):
                parent_report = get_or_404(QualityReport, parent_id)
                iam_context = get_iam_context(self.request, parent_report)

                # For m2m relations this is actually "in"
                queryset = queryset.filter(
                    Q(parents=parent_report) | Q(parents__parents=parent_report)
                )

            if job_id := self.request.query_params.get("job_id", None):
                job = get_or_404(Job, job_id)
                self.check_object_permissions(self.request, job)
                iam_context = get_iam_context(self.request, job)

            if task_id := self.request.query_params.get("task_id", None):
                # NOTE: This filter is too complex to be implemented by other means
                task = get_or_404(Task, task_id)
                self.check_object_permissions(self.request, task)
                iam_context = get_iam_context(self.request, task)

                queryset = queryset.filter(Q(job__segment__task__id=task_id) | Q(task__id=task_id))

            if project_id := self.request.query_params.get("project_id", None):
                # NOTE: This filter is too complex to be implemented by other means
                project = get_or_404(Project, project_id)
                self.check_object_permissions(self.request, project)
                iam_context = get_iam_context(self.request, project)

                queryset = queryset.filter(
                    Q(job__segment__task__project__id=project_id)
                    | Q(task__project__id=project_id)
                    | Q(project__id=project_id)
                )

            perm = QualityReportPermission.create_scope_list(self.request, iam_context=iam_context)
            queryset = perm.filter(queryset)

            if target := self.request.query_params.get(REPORT_TARGET_PARAM_NAME, None):
                if target == QualityReportTarget.JOB:
                    queryset = queryset.filter(job__isnull=False)
                elif target == QualityReportTarget.TASK:
                    queryset = queryset.filter(task__isnull=False)
                elif target == QualityReportTarget.PROJECT:
                    queryset = queryset.filter(project__isnull=False)
                else:
                    raise ValidationError(
                        "Unexpected '{}' filter value '{}'. Valid values are: {}".format(
                            REPORT_TARGET_PARAM_NAME,
                            target,
                            ", ".join(m[0] for m in QualityReportTarget.choices()),
                        )
                    )

            queryset = queryset.defer("data")  # heavy field, should be excluded from COUNT(*)
        else:
            queryset = queryset.select_related(
                "job",
                "job__segment",
                "job__segment__task",
                "job__segment__task__project",
                "task",
                "task__project",
                "project",
            )

        return queryset

    CREATE_REPORT_RQ_ID_PARAMETER = "rq_id"

    @extend_schema(
        operation_id="quality_create_report",
        summary="Create a quality report",
        description=textwrap.dedent(
            """\
            Deprecation warning: Utilizing this endpoint to check the computation status is no longer possible.
            Consider using common requests API: GET /api/requests/<rq_id>
            """
        ),
        parameters=[
            OpenApiParameter(
                CREATE_REPORT_RQ_ID_PARAMETER,
                type=str,
                description=textwrap.dedent(
                    """\
                    The report creation request id. Can be specified to check the report
                    creation status.
                """
                ),
                deprecated=True,
            )
        ],
        request=QualityReportCreateSerializer(required=False),
        responses={
            "201": QualityReportSerializer,
            "202": OpenApiResponse(
                RqIdSerializer,
                description=textwrap.dedent(
                    """\
                    A quality report request has been enqueued, the request id is returned.
                    The request status can be checked at this endpoint by passing the {}
                    as the query parameter. If the request id is specified, this response
                    means the quality report request is queued or is being processed.
                """.format(
                        CREATE_REPORT_RQ_ID_PARAMETER
                    )
                ),
            ),
            "400": OpenApiResponse(
                description="Invalid or failed request, check the response data for details"
            ),
        },
    )
    def create(self, request: ExtendedRequest, *args, **kwargs):
        rq_id = request.query_params.get(self.CREATE_REPORT_RQ_ID_PARAMETER, None)

        if rq_id is None:
            input_serializer = QualityReportCreateSerializer(data=request.data)
            input_serializer.is_valid(raise_exception=True)

            if task_id := input_serializer.validated_data.get("task_id"):
                target = get_or_404(Task, task_id)
            elif project_id := input_serializer.validated_data.get("project_id"):
                target = get_or_404(Project, project_id)
            else:
                assert False

            manager = qc.QualityReportRQJobManager(request=request, db_instance=target)
            return manager.enqueue_job()

        else:
            deprecation_date = datetime(2025, 3, 17, tzinfo=timezone.utc)
            serializer = RqIdSerializer(data={"rq_id": rq_id})
            serializer.is_valid(raise_exception=True)
            rq_id = serializer.validated_data["rq_id"]
            rq_job = qc.QualityReportRQJobManager(request=request).get_job_by_id(rq_id)

            # FUTURE-TODO: move into permissions
            # and allow not only rq job owner to check the status
            if (
                not rq_job
                or not QualityReportPermission.create_scope_check_status(
                    request, rq_job_owner_id=BaseRQMeta.for_job(rq_job).user.id
                )
                .check_access()
                .allow
            ):
                # We should not provide job existence information to unauthorized users
                response = Response(
                    "Unknown request id",
                    status=status.HTTP_404_NOT_FOUND,
                )
                deprecate_response(response, deprecation_date=deprecation_date)
                return response

            rq_job_status = rq_job.get_status(refresh=False)

            if rq_job_status == RqJobStatus.FAILED:
                message = str(rq_job.exc_info)
                rq_job.delete()
                response = Response(
                    message,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
                deprecate_response(response, deprecation_date=deprecation_date)
                return response

            elif rq_job_status in (
                RqJobStatus.QUEUED,
                RqJobStatus.STARTED,
                RqJobStatus.SCHEDULED,
                RqJobStatus.DEFERRED,
            ):
                response = Response(
                    serializer.data,
                    status=status.HTTP_202_ACCEPTED,
                )
                deprecate_response(response, deprecation_date=deprecation_date)
                return response

            elif rq_job_status == RqJobStatus.FINISHED:
                return_value = rq_job.return_value()
                rq_job.delete()
                if not return_value:
                    response = Response(
                        "No report has been computed",
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                    deprecate_response(response, deprecation_date=deprecation_date)
                    return response

                report = self.get_queryset().get(pk=return_value)
                report_serializer = QualityReportSerializer(
                    instance=report, context={"request": request}
                )
                response = Response(
                    data=report_serializer.data,
                    status=status.HTTP_201_CREATED,
                    headers=self.get_success_headers(report_serializer.data),
                )
                deprecate_response(response, deprecation_date=deprecation_date)
                return response

            raise AssertionError(f"Unexpected rq job '{rq_id}' status '{rq_job_status}'")

    @extend_schema(
        operation_id="quality_retrieve_report_data",
        summary="Get quality report contents",
        responses={"200": OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["GET"], url_path="data", serializer_class=None)
    def data(self, request, pk):
        report = self.get_object()  # check permissions
        json_report = qc.prepare_report_for_downloading(report, host=get_server_url(request))
        return HttpResponse(json_report.encode(), content_type="application/json")


SETTINGS_PARENT_TYPE_PARAM_NAME = "parent_type"


@extend_schema(tags=["quality"])
@extend_schema_view(
    list=extend_schema(
        summary="List quality settings instances",
        description=textwrap.dedent(
            """\
            Please note that child task settings are included by default
            if the "project_id" filter is used.
            If you want to restrict results only to a specific parent type, use the "{}" parameter.
        """
        ).format(SETTINGS_PARENT_TYPE_PARAM_NAME),
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter(
                "project_id",
                type=OpenApiTypes.INT,
                description="A simple equality filter for project id",
            ),
            OpenApiParameter(
                SETTINGS_PARENT_TYPE_PARAM_NAME,
                type=OpenApiTypes.STR,
                description="A simple equality filter for parent instance type",
                enum=[v[0] for v in QualitySettingsParentType.choices()],
            ),
        ],
        responses={
            "200": QualitySettingsSerializer(many=True),
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
            "200": QualitySettingsSerializer,
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
        request=QualitySettingsSerializer(partial=True),
        responses={
            "200": QualitySettingsSerializer,
        },
    ),
)
class QualitySettingsViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    PartialUpdateModelMixin,
):
    queryset = QualitySettings.objects

    iam_organization_field = ["task__organization", "project__organization"]
    iam_permission_class = QualitySettingPermission

    search_fields = []
    filter_fields = ["id", "task_id", "project_id", "inherit", "created_date", "updated_date"]
    simple_filters = ["task_id", "inherit"]
    ordering_fields = list(filter_fields)
    ordering = "id"

    serializer_class = QualitySettingsSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            iam_context = None

            if task_id := self.request.query_params.get("task_id", None):
                # This filter requires extra checks
                task = get_or_404(Task, task_id)
                self.check_object_permissions(self.request, task)
                iam_context = get_iam_context(self.request, task)
            elif project_id := self.request.query_params.get("project_id", None):
                # This filter requires extra checks
                project = get_or_404(Project, project_id)
                self.check_object_permissions(self.request, project)
                iam_context = get_iam_context(self.request, project)

                # Include nested settings
                queryset = queryset.filter(
                    Q(task__project__id=project_id) | Q(project__id=project_id)
                )

            if parent_type := self.request.query_params.get(SETTINGS_PARENT_TYPE_PARAM_NAME, None):
                if parent_type == QualitySettingsParentType.TASK:
                    queryset = queryset.filter(task__isnull=False)
                elif parent_type == QualitySettingsParentType.PROJECT:
                    queryset = queryset.filter(project__isnull=False)
                else:
                    raise ValidationError(
                        "Unexpected '{}' filter value '{}'. Valid values are: {}".format(
                            SETTINGS_PARENT_TYPE_PARAM_NAME,
                            parent_type,
                            ", ".join(m[0] for m in QualitySettingsParentType.choices()),
                        )
                    )

            permissions = QualitySettingPermission.create_scope_list(
                self.request, iam_context=iam_context
            )
            queryset = permissions.filter(queryset)

        return queryset
