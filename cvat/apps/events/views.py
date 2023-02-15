# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiResponse, OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.renderers import JSONRenderer


from cvat.apps.iam.permissions import EventsPermission
from cvat.apps.events.serializers import ClientEventsSerializer
from cvat.apps.engine.log import vlogger
from .export import export

class EventsViewSet(viewsets.ViewSet):
    serializer_class = None

    @extend_schema(summary='Method saves logs from a client on the server',
        methods=['POST'],
        description='Sends logs to the Clickhouse if it is connected',
        request=ClientEventsSerializer(),
        responses={
            '201': ClientEventsSerializer(),
        })
    def create(self, request):
        serializer = ClientEventsSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        for event in serializer.data["events"]:
            message = JSONRenderer().render(event).decode('UTF-8')
            vlogger.info(message)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary='Method returns csv log file ',
        methods=['GET'],
        description='Recieve logs from the server',
        parameters=[
            OpenApiParameter('org_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by organization ID"),
            OpenApiParameter('project_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by project ID"),
            OpenApiParameter('task_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by task ID"),
            OpenApiParameter('job_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by job ID"),
            OpenApiParameter('user_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by user ID"),
            OpenApiParameter('from', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="Filter events after the datetime. If no 'from' or 'to' parameters are passed, the last 30 days will be set."),
            OpenApiParameter('to', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="Filter events before the datetime. If no 'from' or 'to' parameters are passed, the last 30 days will be set."),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('query_id', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description="ID of query request that need to check or download"),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='CSV log file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a CSV log file has been started'),
        })
    def list(self, request):
        perm = EventsPermission.create_scope_list(request)
        filter_query = perm.filter(request.query_params)
        return export(
            request=request,
            filter_query=filter_query,
            queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
        )
