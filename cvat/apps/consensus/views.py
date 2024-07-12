# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

import django_rq
from django.conf import settings
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

from cvat.apps.consensus.consensus_reports import prepare_report_for_downloading
from cvat.apps.consensus.merge_consensus_jobs import merge_task
from cvat.apps.consensus.models import ConsensusConflict, ConsensusReport, ConsensusSettings
from cvat.apps.consensus.permissions import (
    ConsensusConflictPermission,
    ConsensusReportPermission,
    ConsensusSettingPermission,
)
from cvat.apps.consensus.serializers import (
    ConsensusConflictSerializer,
    ConsensusReportCreateSerializer,
    ConsensusReportSerializer,
    ConsensusSettingsSerializer,
)
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.models import Task
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.utils import get_server_url

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
        summary="List annotation conflicts in a consensus report",
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter(
                "report_id",
                type=OpenApiTypes.INT,
                description="A simple equality filter for report id",
            ),
        ],
        responses={
            "200": ConsensusConflictSerializer(many=True),
        },
    ),
)
class ConsensusConflictsViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = (
        ConsensusConflict.objects.select_related(
            "report",
            "report__job",
            "report__job__segment",
            "report__job__segment__task",
            "report__job__segment__task__organization",
            "report__task",
            "report__task__organization",
        )
        .prefetch_related(
            "annotation_ids",
        )
        .all()
    )

    iam_organization_field = [
        "report__job__segment__task__organization",
        "report__task__organization",
    ]

    search_fields = []
    filter_fields = list(search_fields) + ["id", "frame", "type", "job_id", "task_id"]
    simple_filters = set(filter_fields) - {"id"}
    lookup_fields = {
        "job_id": "report__job__id",
        "task_id": "report__job__segment__task__id",  # task reports do not contain own conflicts
    }
    ordering_fields = list(filter_fields)
    ordering = "-id"
    serializer_class = ConsensusConflictSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            if report_id := self.request.query_params.get("report_id", None):
                # NOTE: This filter is too complex to be implemented by other means,
                # it has a dependency on the report type
                try:
                    report = ConsensusReport.objects.get(id=report_id)
                except ConsensusReport.DoesNotExist as ex:
                    raise NotFound(f"Report {report_id} does not exist") from ex

                self.check_object_permissions(self.request, report)

                queryset = queryset.filter(report=report)
            else:
                perm = ConsensusConflictPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

        return queryset


@extend_schema(tags=["consensus"])
@extend_schema_view(
    retrieve=extend_schema(
        operation_id="consensus_retrieve_report",  # the default produces the plural
        summary="Get consensus report details",
        responses={
            "200": ConsensusReportSerializer,
        },
    ),
    list=extend_schema(
        summary="List consensus reports",
        parameters=[
            # These filters are implemented differently from others
            OpenApiParameter(
                "task_id", type=OpenApiTypes.INT, description="A simple equality filter for task id"
            ),
        ],
        responses={
            "200": ConsensusReportSerializer(many=True),
        },
    ),
)
class ConsensusReportViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
):
    queryset = ConsensusReport.objects.prefetch_related(
        "job",
        "job__segment",
        "job__segment__task",
        "job__segment__task__organization",
        "task",
        "task__organization",
    ).all()

    iam_organization_field = ["job__segment__task__organization", "task__organization"]

    search_fields = []
    filter_fields = list(search_fields) + [
        "id",
        "job_id",
        "created_date",
        "target_last_updated",
    ]
    simple_filters = list(set(filter_fields) - {"id", "created_date", "target_last_updated"})
    ordering_fields = list(filter_fields)
    ordering = "id"

    def get_serializer_class(self):
        # a separate method is required for drf-spectacular to work
        return ConsensusReportSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
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
            else:
                perm = ConsensusReportPermission.create_scope_list(self.request)
                queryset = perm.filter(queryset)

        return queryset

    CREATE_REPORT_RQ_ID_PARAMETER = "rq_id"

    @extend_schema(
        operation_id="consensus_create_report",
        summary="Create a consensus report",
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
        request=ConsensusReportCreateSerializer(required=False),
        responses={
            "201": ConsensusReportSerializer,
            "202": OpenApiResponse(
                RqIdSerializer,
                description=textwrap.dedent(
                    """\
                    A consensus report request has been enqueued, the request id is returned.
                    The request status can be checked at this endpoint by passing the {}
                    as the query parameter. If the request id is specified, this response
                    means the consensus report request is queued or is being processed.
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
        input_serializer = ConsensusReportCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        task_id = input_serializer.validated_data["task_id"]

        queue_name = settings.CVAT_QUEUES.CONSENSUS.value
        queue = django_rq.get_queue(queue_name)
        # rq_id = request.query_params.get(self.CREATE_REPORT_RQ_ID_PARAMETER, None)
        rq_id = request.data.get("rq_id", f"merge_consensus:task.id{task_id}-by-{request.user}")
        rq_job = queue.fetch_job(rq_id)

        if rq_job is None:
            try:
                task = Task.objects.get(pk=task_id)
            except Task.DoesNotExist as ex:
                raise NotFound(f"Task {task_id} does not exist") from ex

            try:
                rq_id = merge_task(task, request)
                serializer = RqIdSerializer({"rq_id": rq_id})
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            except Exception as ex:
                raise ValidationError(str(ex))

        else:
            if (
                not rq_job
                or not ConsensusReportPermission.create_scope_check_status(
                    request, job_owner_id=rq_job.meta["user"]["id"]
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
                return_value = rq_job.return_value()
                rq_job.delete()
                if not return_value:
                    raise ValidationError("No report has been computed")

                report = self.get_queryset().get(pk=return_value)
                report_serializer = ConsensusReportSerializer(instance=report)
                return Response(
                    data=report_serializer.data,
                    status=status.HTTP_201_CREATED,
                    headers=self.get_success_headers(report_serializer.data),
                )

    @extend_schema(
        operation_id="consensus_retrieve_report_data",
        summary="Get consensus report contents",
        responses={"200": OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=["GET"], url_path="data", serializer_class=None)
    def data(self, request, pk):
        report = self.get_object()  # check permissions
        json_report = prepare_report_for_downloading(report, host=get_server_url(request))
        return HttpResponse(json_report.encode())


@extend_schema(tags=["consensus"])
@extend_schema_view(
    list=extend_schema(
        summary="List consensus settings instances",
        responses={
            "200": ConsensusSettingsSerializer(many=True),
        },
    ),
    retrieve=extend_schema(
        summary="Get consensus settings instance details",
        parameters=[
            OpenApiParameter(
                "id",
                type=OpenApiTypes.INT,
                location="path",
                description="An id of a consensus settings instance",
            )
        ],
        responses={
            "200": ConsensusSettingsSerializer,
        },
    ),
    partial_update=extend_schema(
        summary="Update a consensus settings instance",
        parameters=[
            OpenApiParameter(
                "id",
                type=OpenApiTypes.INT,
                location="path",
                description="An id of a consensus settings instance",
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
