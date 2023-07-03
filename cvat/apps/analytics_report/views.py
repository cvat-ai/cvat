# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import textwrap

from django.conf import settings
from rest_framework import status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from drf_spectacular.utils import OpenApiResponse, OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.renderers import JSONRenderer


from cvat.apps.iam.permissions import EventsPermission
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS

from cvat.apps.engine.models import Job, Task, Project

from cvat.apps.analytics_report.models import AnalyticsReport
from cvat.apps.analytics_report.report.get import get_analytics_report
from cvat.apps.analytics_report.serializers import AnalyticsReportSerializer
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.analytics_report.report.create import JobAnalyticsReportUpdateManager
from cvat.apps.analytics_report.report.get import get_analytics_report

class AnalyticsReportViewSet(viewsets.ViewSet):
    serializer_class = None

    def get_queryset(self):
        return AnalyticsReport.objects

    @extend_schema(
        operation_id="analytics_create_report",
        summary="Creates a analytics report asynchronously and allows to check request status",
        parameters=[
            OpenApiParameter(
                "rq_id",
                type=str,
                description=textwrap.dedent(
                    """\
                    The report creation request id. Can be specified to check the report
                    creation status.
                """
                ),
            ),
            OpenApiParameter('project_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Specify project ID"),
            OpenApiParameter('task_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Specify task ID"),
            OpenApiParameter('job_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Specify job ID"),
            OpenApiParameter('startDate', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="TODO"),
            OpenApiParameter('endDate', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="TODO"),
        ],
        responses={
            "201": AnalyticsReportSerializer,
            "202": OpenApiResponse(
                RqIdSerializer,
                description=textwrap.dedent(
                    """\
                    A quality report request has been enqueued, the request id is returned.
                    The request status can be checked at this endpoint by passing the {}
                    as the query parameter. If the request id is specified, this response
                    means the quality report request is queued or is being processed.
                """.format(
                        "rq_id"
                    )
                ),
            ),
            "400": OpenApiResponse(
                description="Invalid or failed request, check the response data for details"
            ),
        },
    )
    def create(self, request, *args, **kwargs):
        # TODO
        # self.check_permissions(request)

        rq_id = request.query_params.get("rq_id", None)

        if rq_id is None:
            job_id = request.query_params.get('job_id', None)
            task_id = request.query_params.get('task_id', None)
            project_id = request.query_params.get('project_id', None)

            if job_id is None and task_id is None and project_id is None:
                raise serializers.ValidationError("No any job, task or project specified")

            if [job_id, task_id, project_id].count(True) > 1:
                raise serializers.ValidationError("Only one of job_id, task_id or project_id must be specified")

            if job_id is not None:
                try:
                    job = Job.objects.get(pk=int(job_id))
                except Job.DoesNotExist as ex:
                    raise NotFound(f"Job {job_id} does not exist") from ex

                try:
                    rq_id = JobAnalyticsReportUpdateManager().schedule_analytics_check_job(
                        job, user_id=request.user.id
                    )
                    serializer = RqIdSerializer({"rq_id": rq_id})
                    return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
                except JobAnalyticsReportUpdateManager.AnalyticsReportsNotAvailable as ex:
                    raise ValidationError(str(ex))
            elif task_id is not None:
                try:
                    task = Task.objects.get(pk=int(task_id))
                except Task.DoesNotExist as ex:
                    raise NotFound(f"Task {task_id} does not exist") from ex
                raise NotImplementedError()
            elif project_id is not None:
                try:
                    project = Project.objects.get(pk=int(project_id))
                except Project.DoesNotExist as ex:
                    raise NotFound(f"Project {project_id} does not exist") from ex
                raise NotImplementedError()
        else:
            serializer = RqIdSerializer(data={"rq_id": rq_id})
            serializer.is_valid(raise_exception=True)
            rq_id = serializer.validated_data["rq_id"]

            report_manager = JobAnalyticsReportUpdateManager()
            rq_job = report_manager.get_analytics_check_job(rq_id)
            # if (
            #     not rq_job
            #     or not QualityReportPermission.create_scope_check_status(
            #         request, job_owner_id=rq_job.meta["user_id"]
            #     )
            #     .check_access()
            #     .allow
            # ):
            #     # We should not provide job existence information to unauthorized users
            #     raise NotFound("Unknown request id")

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

                return get_analytics_report(request, {**request.query_params, "job_id": return_value})

    @extend_schema(summary='Method returns analytics report',
        methods=['GET'],
        description='Receive analytics report',
        parameters=[
            OpenApiParameter('project_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Specify project ID"),
            OpenApiParameter('task_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Specify task ID"),
            OpenApiParameter('job_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Specify job ID"),
            OpenApiParameter('startDate', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="TODO"),
            OpenApiParameter('endDate', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="TODO"),
        ],
        responses={
            '200': OpenApiResponse(description='...'),
            '404': OpenApiResponse(description='Not found'),
        })
    def list(self, request):
        # TODO implement permission check
        # perm = EventsPermission.create_scope_list(request)
        # filter_query = perm.filter(request.query_params)
        return get_analytics_report(
            request=request,
            query_params=request.query_params,
            # queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
        )
