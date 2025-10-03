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
from rest_framework import mixins, viewsets
from rest_framework.exceptions import NotFound

from cvat.apps.consensus import merging_manager as merging
from cvat.apps.consensus.models import ConsensusSettings
from cvat.apps.consensus.permissions import ConsensusMergePermission, ConsensusSettingPermission
from cvat.apps.consensus.serializers import (
    ConsensusMergeCreateSerializer,
    ConsensusSettingsSerializer,
)
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.models import Job, Task
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.view_utils import get_410_response_when_checking_process_status
from cvat.apps.redis_handler.serializers import RqIdSerializer


@extend_schema(tags=["consensus"])
class ConsensusMergesViewSet(viewsets.GenericViewSet):
    iam_permission_class = ConsensusMergePermission

    CREATE_MERGE_RQ_ID_PARAMETER = "rq_id"

    @extend_schema(
        operation_id="consensus_create_merge",
        summary="Create a consensus merge",
        request=ConsensusMergeCreateSerializer,
        responses={
            "202": OpenApiResponse(
                RqIdSerializer,
                description=textwrap.dedent(
                    """\
                    A consensus merge request has been enqueued, the request id is returned.
                    The request status can be checked by using common requests API: GET /api/requests/<rq_id>
                """
                ),
            ),
            "400": OpenApiResponse(
                description="Invalid or failed request, check the response data for details"
            ),
        },
    )
    def create(self, request: ExtendedRequest, *args, **kwargs):
        rq_id = request.query_params.get(self.CREATE_MERGE_RQ_ID_PARAMETER, None)

        if rq_id:
            return get_410_response_when_checking_process_status("merge")

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

        manager = merging.MergingManager(request=request, db_instance=instance)
        return manager.enqueue_job()


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
    iam_permission_class = ConsensusSettingPermission

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
