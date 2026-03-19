# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from cvat.apps.engine.location import Location
from cvat.apps.engine.log import vlogger
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.events.export import EventsExporter
from cvat.apps.events.permissions import EventsPermission
from cvat.apps.events.serializers import ClientEventsSerializer
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.redis_handler.serializers import RqIdSerializer

from .const import USER_ACTIVITY_SCOPE
from .export import export
from .handlers import handle_client_events_push

api_filter_parameters = (
    OpenApiParameter(
        "org_id",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.INT,
        required=False,
        description="Filter events by organization ID",
    ),
    OpenApiParameter(
        "project_id",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.INT,
        required=False,
        description="Filter events by project ID",
    ),
    OpenApiParameter(
        "task_id",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.INT,
        required=False,
        description="Filter events by task ID",
    ),
    OpenApiParameter(
        "job_id",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.INT,
        required=False,
        description="Filter events by job ID",
    ),
    OpenApiParameter(
        "user_id",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.INT,
        required=False,
        description="Filter events by user ID",
    ),
    OpenApiParameter(
        "from",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.DATETIME,
        required=False,
        description="UTC start date for events filtration. Default is the minimal time.",
    ),
    OpenApiParameter(
        "to",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.DATETIME,
        required=False,
        description="UTC end date for events filtration. Default is the current time.",
    ),
    OpenApiParameter(
        "filename",
        description="Desired output file name",
        location=OpenApiParameter.QUERY,
        type=OpenApiTypes.STR,
        required=False,
    ),
)


class EventsViewSet(viewsets.ViewSet):
    serializer_class = None
    iam_permission_class = EventsPermission

    @extend_schema(
        summary="Log client events",
        methods=["POST"],
        description="Sends logs to the Clickhouse if it is connected",
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        request=ClientEventsSerializer(),
        responses={
            "201": ClientEventsSerializer(),
        },
    )
    def create(self, request):
        serializer = ClientEventsSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        handle_client_events_push(request, serializer.validated_data)
        for event in serializer.validated_data["events"]:
            if event["scope"] == USER_ACTIVITY_SCOPE:
                # do not record these events, we only need them for correct working time computation
                continue

            message = (
                JSONRenderer()
                .render({**event, "timestamp": str(event["timestamp"].timestamp())})
                .decode("UTF-8")
            )
            vlogger.info(message)

        return Response(serializer.validated_data, status=status.HTTP_201_CREATED)

    # FUTURE-TODO: remove deprecated API endpoint after several releases
    @extend_schema(
        summary="Get an event log",
        methods=["GET"],
        description="The log is returned in the CSV format.",
        parameters=[
            *api_filter_parameters,
            OpenApiParameter(
                "action",
                location=OpenApiParameter.QUERY,
                description="Used to start downloading process after annotation file had been created",
                type=OpenApiTypes.STR,
                required=False,
                enum=["download"],
            ),
            OpenApiParameter(
                "query_id",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                required=False,
                description="ID of query request that need to check or download",
            ),
        ],
        responses={
            "200": OpenApiResponse(description="Download of file started"),
            "201": OpenApiResponse(description="CSV log file is ready for downloading"),
            "202": OpenApiResponse(description="Creating a CSV log file has been started"),
        },
        deprecated=True,
    )
    def list(self, request: ExtendedRequest):
        self.check_permissions(request)

        if (
            request.query_params.get("cloud_storage_id")
            or request.query_params.get("location") == Location.CLOUD_STORAGE
        ):
            raise serializers.ValidationError(
                "This endpoint does not support exporting events to cloud storage"
            )

        return export(request=request)

    @extend_schema(
        summary="Initiate a process to export events",
        request=None,
        parameters=[
            *api_filter_parameters,
            OpenApiParameter(
                "location",
                description="Where need to save events file",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                required=False,
                enum=Location.list(),
            ),
            OpenApiParameter(
                "cloud_storage_id",
                description="Storage id",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.INT,
                required=False,
            ),
        ],
        responses={
            "202": OpenApiResponse(RqIdSerializer),
        },
    )
    @action(detail=False, methods=["POST"], url_path="export")
    def initiate_export(self, request: ExtendedRequest):
        self.check_permissions(request)
        exporter = EventsExporter(request=request)
        return exporter.enqueue_job()

    @extend_schema(
        summary="Download a prepared file with events",
        request=None,
        parameters=[
            OpenApiParameter(
                "rq_id",
                description="Request ID",
                location=OpenApiParameter.QUERY,
                type=OpenApiTypes.STR,
                required=True,
            ),
        ],
        responses={
            "200": OpenApiResponse(description="Download of file started"),
        },
        exclude=True,  # private API endpoint that should be used only as result_url
    )
    @action(detail=False, methods=["GET"], url_path="download")
    def download_file(self, request: ExtendedRequest):
        self.check_permissions(request)

        downloader = EventsExporter(request=request).get_downloader()
        return downloader.download_file()
