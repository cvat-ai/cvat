# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rq.job import JobStatus as RqJobStatus

from cvat.apps.consensus import merging_manager as merging
from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.consensus.permissions import ConsensusMergePermission, ConsensusSettingPermission
from cvat.apps.consensus.serializers import (
    ConsensusMergeCreateSerializer,
    ConsensusSettingsSerializer,
)
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.models import Job, Task
from cvat.apps.engine.rq import BaseRQMeta
from cvat.apps.engine.serializers import RqIdSerializer
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import process_failed_job


@extend_schema(tags=["consensus"])
class ConsensusMergesViewSet(viewsets.GenericViewSet):
    CREATE_MERGE_RQ_ID_PARAMETER = "rq_id"

    @extend_schema(
        operation_id="consensus_create_merge",
        summary="Create a consensus merge",
        parameters=[
            OpenApiParameter(
                CREATE_MERGE_RQ_ID_PARAMETER,
                type=str,
                description=textwrap.dedent(
                    """\
                    The consensus merge request id. Can be specified to check operation status.
                """
                ),
            )
        ],
        request=ConsensusMergeCreateSerializer(required=False),
        responses={
            "201": None,
            "202": OpenApiResponse(
                RqIdSerializer,
                description=textwrap.dedent(
                    """\
                    A consensus merge request has been enqueued, the request id is returned.
                    The request status can be checked at this endpoint by passing the {}
                    as the query parameter. If the request id is specified, this response
                    means the consensus merge request is queued or is being processed.
                """.format(
                        CREATE_MERGE_RQ_ID_PARAMETER
                    )
                ),
            ),
            "400": OpenApiResponse(
                description="Invalid or failed request, check the response data for details"
            ),
        },
    )
    def create(self, request: ExtendedRequest, *args, **kwargs):
        rq_id = request.query_params.get(self.CREATE_MERGE_RQ_ID_PARAMETER, None)

        if rq_id is None:
            input_serializer = ConsensusMergeCreateSerializer(data=request.data)
            input_serializer.is_valid(raise_exception=True)

            task_id = input_serializer.validated_data.get("task_id", None)
            job_id = input_serializer.validated_data.get("job_id", None)
            if task_id:
                try:
                    instance = Task.objects.get(pk=task_id)
                except Task.DoesNotExist as ex:
                    raise NotFound(f"Task {task_id} does not exist") from ex
            elif job_id:
                try:
                    instance = Job.objects.select_related("segment").get(pk=job_id)
                except Job.DoesNotExist as ex:
                    raise NotFound(f"Jobs {job_id} do not exist") from ex

            try:
                manager = merging.MergingManager()
                rq_id = manager.schedule_merge(instance, request=request)
                serializer = RqIdSerializer({"rq_id": rq_id})
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            except merging.MergingNotAvailable as ex:
                raise ValidationError(str(ex))
        else:
            serializer = RqIdSerializer(data={"rq_id": rq_id})
            serializer.is_valid(raise_exception=True)
            rq_id = serializer.validated_data["rq_id"]

            manager = merging.MergingManager()
            rq_job = manager.get_job(rq_id)
            if (
                not rq_job
                or not ConsensusMergePermission.create_scope_check_status(
                    request, rq_job_owner_id=BaseRQMeta.for_job(rq_job).user.id
                )
                .check_access()
                .allow
            ):
                # We should not provide job existence information to unauthorized users
                raise NotFound("Unknown request id")

            rq_job_status = rq_job.get_status(refresh=False)
            if rq_job_status == RqJobStatus.FAILED:
                exc_info = process_failed_job(rq_job)

                exc_name_pattern = f"{merging.MergingNotAvailable.__name__}: "
                if (exc_pos := exc_info.find(exc_name_pattern)) != -1:
                    return Response(
                        data=exc_info[exc_pos + len(exc_name_pattern) :].strip(),
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                return Response(data=str(exc_info), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            elif rq_job_status in (
                RqJobStatus.QUEUED,
                RqJobStatus.STARTED,
                RqJobStatus.SCHEDULED,
                RqJobStatus.DEFERRED,
            ):
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            elif rq_job_status == RqJobStatus.FINISHED:
                rq_job.delete()
                return Response(status=status.HTTP_201_CREATED)

            raise AssertionError(f"Unexpected rq job '{rq_id}' status '{rq_job_status}'")


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
    queryset = ConsensusSettings.objects

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
