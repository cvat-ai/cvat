# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from dateutil import parser as datetime_parser
import datetime

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiResponse, OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.renderers import JSONRenderer


from cvat.apps.events.serializers import ClientEventsSerializer, EventSerializer
from cvat.apps.engine.log import clogger, vlogger
from .export import export

class EventsViewSet(viewsets.ViewSet):
    serializer_class = None
    TIME_THRESHOLD = 100 # seconds

    @staticmethod
    @extend_schema(summary='Method saves logs from a client on the server',
        methods=['POST'],
        description='Sends logs to the Clickhouse if it is connected',
        request=ClientEventsSerializer(),
        responses={
            '201': ClientEventsSerializer(),
        })
    @extend_schema(summary='Method returns csv log file ',
        methods=['GET'],
        description='Recieve logs from the server',
        parameters=[
            OpenApiParameter('organization', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by organization ID"),
            OpenApiParameter('project', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by project ID"),
            OpenApiParameter('task', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by task ID"),
            OpenApiParameter('job', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by job ID"),
            OpenApiParameter('user', location=OpenApiParameter.QUERY, type=OpenApiTypes.INT, required=False,
                description="Filter events by user ID"),
            OpenApiParameter('from', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="Filter events after the datetime"),
            OpenApiParameter('to', location=OpenApiParameter.QUERY, type=OpenApiTypes.DATETIME, required=False,
                description="Filter events before the datetime"),
            OpenApiParameter('filename', description='Desired output file name',
                location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False),
            OpenApiParameter('action', location=OpenApiParameter.QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=OpenApiTypes.STR, required=False, enum=['download']),
            OpenApiParameter('query-id', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR, required=False,
                description="ID of query request that need to check or download"),
        ],
        responses={
            '200': OpenApiResponse(description='Download of file started'),
            '201': OpenApiResponse(description='CSV log file is ready for downloading'),
            '202': OpenApiResponse(description='Creating a CSV log file has been started'),
        })
    @action(detail=False, methods=['GET', 'POST'])
    def events(request):
        if request.method == 'POST':
            import json
            serializer = ClientEventsSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            send_time = datetime_parser.isoparse(serializer.data["send_timestamp"])
            receive_time = datetime.datetime.now(datetime.timezone.utc)
            time_correction = receive_time - send_time
            last_timestamp = None

            for event in serializer.data["events"]:
                event['user'] = request.user.id
                timestamp = datetime_parser.isoparse(event['timestamp'])
                if last_timestamp:
                    t_diff = timestamp - last_timestamp
                    if t_diff.seconds < EventsViewSet.TIME_THRESHOLD:
                        payload = event.get('payload', {})
                        if payload:
                            payload = json.loads(payload)

                        payload['working_time'] = t_diff.microseconds // 1000
                        event['payload'] = json.dumps(payload)

                last_timestamp = timestamp
                event['timestamp'] = str((timestamp + time_correction).timestamp())
                event['source'] = 'client'
                message = JSONRenderer().render(event).decode('UTF-8')
                jid = event.get("job")
                tid = event.get("task")
                if jid:
                    clogger.job[jid].info(message)
                elif tid:
                    clogger.task[tid].info(message)
                else:
                    clogger.glob.info(message)

                vlogger.info(message)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        elif request.method == 'GET':
            return export(
                request=request,
                queue_name=settings.CVAT_QUEUES.EXPORT_DATA.value,
            )

    @staticmethod
    @extend_schema(summary='Method saves an exception from a client on the server',
        description='Sends logs to the ELK if it is connected',
        request=EventSerializer, responses={
            '201': ClientEventsSerializer,
        })
    @action(detail=False, methods=['POST'], serializer_class=EventSerializer)
    def exception(request):
        serializer = EventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = serializer.data

        additional_info = {
            "user": request.user.id,
            "scope": "send:exception",
            "source": "client"
        }
        event['timestamp'] = str(datetime.datetime.now(datetime.timezone.utc).timestamp())
        message = JSONRenderer().render({**event, **additional_info}).decode('UTF-8')
        jid = event.get("job_id")
        tid = event.get("task_id")
        if jid:
            clogger.job[jid].error(message)
        elif tid:
            clogger.task[tid].error(message)
        else:
            clogger.glob.error(message)

        vlogger.info(message)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
