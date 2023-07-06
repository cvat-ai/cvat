# Copyright (C) 2023 CVAT.ai Corporation
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
from cvat.apps.engine.models import Project, Task
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.utils import get_server_url
from cvat.apps.iam.permissions import (
    AnnotationConflictPermission,
    QualityReportPermission,
    QualitySettingPermission,
)
from cvat.apps.quality_control import quality_reports as qc
from cvat.apps.quality_control.models import (
    AnnotationConflict,
    QualityReport,
    QualityReportTarget,
    QualitySettings,
)
from cvat.apps.quality_control.serializers import (
    AnnotationConflictSerializer,
    QualityReportCreateSerializer,
    QualityReportSerializer,
    QualitySettingsSerializer,
)


@extend_schema(tags=["quality"])
@extend_schema_view(
    list=extend_schema(
        summary="Method returns a paginated list of annotation conflicts",
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
    queryset = (
        AnnotationConflict.objects.select_related(
            "report",
            "report__job",
            "report__job__segment",
            "report__job__segment__task",
            "report__job__segment__task__organization",
            "report__task",
            "report__task__organization",
        )
        .prefetch_related(
            "report__parents",
            "annotation_ids",
        )
        .all()
    )

    iam_organization_field = [
        "report__job__segment__task__organization",
        "report__task__organization",
    ]

    search_fields = []
    filter_fields = list(search_fields) + ["id", "frame", "type", "job_id", "task_id", "severity"]
    simple_filters = set(filter_fields) - {"id"}
    lookup_fields = {
        "job_id": "report__job__id",
        "task_id": "report__job__segment__task__id",  # task reports do not contain own conflicts
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
                try:
                    report = QualityReport.objects.get(id=report_id)
                except QualityReport.DoesNotExist as ex:
                    raise NotFound(f"Report {report_id} does not exist") from ex

                self.check_object_permissions(self.request, report)

                if report.target == QualityReportTarget.TASK:
                    queryset = queryset.filter(
                        Q(report=report) | Q(report__parents__in=[report])
                    ).distinct()
                elif report.target == QualityReportTarget.JOB:
                    queryset = queryset.filter(report=report)
                elif report.target == QualityReportTarget.PROJECT:
                    # project reports would contain too many conflicts to adequately use such info
                    queryset = AnnotationConflict.objects.none()
                else:
                    assert False
            else:
                perm = AnnotationConflictPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

        return queryset


@extend_schema(tags=["quality"])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id="quality_retrieve_report",  # the default produces the plural
        summary="Method returns details of a quality report",
        responses={
            "200": QualityReportSerializer,
        },
    ),
    list=extend_schema(
        summary="Method returns a paginated list of quality reports",
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
                "target", type=OpenApiTypes.STR, description="A simple equality filter for target"
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
    @staticmethod
    def _add_prefetch_params(queryset):
        return queryset.prefetch_related(
            "job",
            "job__segment",
            "job__segment__task",
            "job__segment__task__organization",
            "task",
            "task__organization",
            "project",
            "project__organization",
        )

    queryset = _add_prefetch_params(QualityReport.objects.get_queryset()).all()

    iam_organization_field = [
        "job__segment__task__organization",
        "task__organization",
        "project__organization",
    ]

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
    simple_filters = list(
        set(filter_fields)
        - {"id", "created_date", "gt_last_updated", "target_last_updated", "task_id", "project_id"}
    )
    ordering_fields = list(filter_fields)
    ordering = "-id"

    def get_serializer_class(self):
        # a separate method is required for drf-spectacular to work
        return QualityReportSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            # NOTE: parent id filter requires a different queryset,
            # since there is no 'contains' lookup for an m2m relation in Django
            if parent_id := self.request.query_params.get("parent_id", None):
                try:
                    parent_report = QualityReport.objects.get(id=parent_id)
                except QualityReport.DoesNotExist as ex:
                    raise NotFound(f"Quality report {parent_id} does not exist") from ex

                queryset = self._add_prefetch_params(parent_report.children).all()

            if task_id := self.request.query_params.get("task_id", None):
                # NOTE: This filter is too complex to be implemented by other means
                try:
                    task = Task.objects.get(id=task_id)
                except Task.DoesNotExist as ex:
                    raise NotFound(f"Task {task_id} does not exist") from ex

                self.check_object_permissions(self.request, task)

                queryset = queryset.filter(
                    Q(job__segment__task__id=task_id) | Q(task__id=task_id)
                ).distinct()

            if project_id := self.request.query_params.get("project_id", None):
                # NOTE: This filter is too complex to be implemented by other means
                try:
                    project = Project.objects.get(id=project_id)
                except Project.DoesNotExist as ex:
                    raise NotFound(f"Project {project_id} does not exist") from ex

                self.check_object_permissions(self.request, project)

                queryset = queryset.filter(
                    Q(job__segment__task__project__id=project_id)
                    | Q(task__project__id=project_id)
                    | Q(project__id=project_id)
                ).distinct()

            perm = QualityReportPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

            if target := self.request.query_params.get("target", None):
                if target == QualityReportTarget.JOB:
                    queryset = queryset.filter(job__isnull=False)
                elif target == QualityReportTarget.TASK:
                    queryset = queryset.filter(task__isnull=False)
                elif target == QualityReportTarget.PROJECT:
                    queryset = queryset.filter(project__isnull=False)
                else:
                    raise ValidationError(
                        "Unexpected 'target' filter value '{}'. Valid values are: {}".format(
                            target, ", ".join(m[0] for m in QualityReportTarget.choices())
                        )
                    )

        return queryset

    CREATE_REPORT_RQ_ID_PARAMETER = "rq_id"

    @extend_schema(
        operation_id="quality_create_report",
        summary="Creates a quality report asynchronously and allows to check request status",
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
    def create(self, request, *args, **kwargs):
        self.check_permissions(request)

        rq_id = request.query_params.get(self.CREATE_REPORT_RQ_ID_PARAMETER, None)

        if rq_id is None:
            input_serializer = QualityReportCreateSerializer(data=request.data)
            input_serializer.is_valid(raise_exception=True)

            if task_id := input_serializer.validated_data.get("task_id"):
                try:
                    task = Task.objects.get(pk=task_id)
                except Task.DoesNotExist as ex:
                    raise NotFound(f"Task {task_id} does not exist") from ex

                manager = qc.TaskQualityReportUpdateManager()
                job_params = {"task": task}
            elif project_id := input_serializer.validated_data.get("project_id"):
                try:
                    project = Project.objects.get(pk=project_id)
                except Project.DoesNotExist as ex:
                    raise NotFound(f"Project {project_id} does not exist") from ex

                manager = qc.ProjectQualityReportUpdateManager()
                job_params = {"project": project}
            else:
                assert False

            try:
                rq_id = manager.schedule_quality_check_job(**job_params, user_id=request.user.id)
                serializer = RqIdSerializer({"rq_id": rq_id})
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            except (
                qc.TaskQualityReportUpdateManager.QualityReportsNotAvailable,
                qc.ProjectQualityReportUpdateManager.QualityReportsNotAvailable,
            ) as ex:
                raise ValidationError(str(ex))

        else:
            serializer = RqIdSerializer(data={"rq_id": rq_id})
            serializer.is_valid(raise_exception=True)
            rq_id = serializer.validated_data["rq_id"]

            report_manager = qc.TaskQualityReportUpdateManager()
            rq_job = report_manager.get_quality_check_job(rq_id)
            if (
                not rq_job
                or not QualityReportPermission.create_scope_check_status(
                    request, job_owner_id=rq_job.meta["user_id"]
                )
                .check_access()
                .allow
            ):
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
                    headers=self.get_success_headers(report_serializer.data),
                )

    @extend_schema(
        operation_id="quality_retrieve_report_data",
        summary="Retrieve full contents of the report in JSON format",
        responses={"200": OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["GET"], url_path="data", serializer_class=None)
    def data(self, request, pk):
        report = self.get_object()  # check permissions
        json_report = qc.prepare_report_for_downloading(report, host=get_server_url(request))
        return HttpResponse(json_report.encode())


@extend_schema(tags=["quality"])
@extend_schema_view(
    list=extend_schema(
        summary="Method returns a paginated list of quality settings instances",
        responses={
            "200": QualitySettingsSerializer(many=True),
        },
    ),
    retrieve=extend_schema(
        summary="Method returns details of the quality settings instance",
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
    create=extend_schema(
        summary="Method creates quality settings",
        description="Can only be called for a project, task settings are initialized automatically",
        request=QualitySettingsSerializer,
        responses={
            "200": QualitySettingsSerializer,
        },
    ),
    partial_update=extend_schema(
        summary="Methods does a partial update of chosen fields in the quality settings instance",
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
    mixins.CreateModelMixin,
    PartialUpdateModelMixin,
):
    queryset = QualitySettings.objects.select_related(
        "task", "task__organization", "project", "project__organization"
    ).all()

    iam_organization_field = "task__organization"

    search_fields = []
    filter_fields = ["id", "task_id", "project_id"]
    simple_filters = ["task_id", "project_id"]
    ordering_fields = ["id"]
    ordering = "id"

    serializer_class = QualitySettingsSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            permissions = QualitySettingPermission.create_scope_list(self.request)
            queryset = permissions.filter(queryset)

        return queryset
