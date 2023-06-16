# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiResponse, OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.renderers import JSONRenderer


from cvat.apps.iam.permissions import EventsPermission
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.events.serializers import ClientEventsSerializer
from cvat.apps.engine.log import vlogger

class AnalyticsReportViewSet(viewsets.ViewSet):
    serializer_class = None

    def list(self, request):
        moc_data =  {
        "last_updated": "2023-06-06T00:00:00Z",
        "type": "job",
        "id": 123,
        "statistics": {
            "objects": {
            "title": "Some Title",
            "description": "Detailed description",
            "granularity": "day",
            "dafault_view": "histogram",
            "dataseries": {
                "created" : [
                    {
                    "value": {
                        "tracked_shapes": 123,
                        "shapes": 234,
                        "tags": 345
                    },
                    "datetime": "2023-06-05T00:00:00Z"
                    },
                    {
                    "value": {
                        "tracked_shapes": 123,
                        "shapes": 234,
                        "tags": 345
                    },
                    "datetime": "2023-06-06T00:00:00Z"
                    }
                ],
                "updated": [
                    {
                    "value": {
                        "tracked_shapes": 123,
                        "shapes": 234,
                        "tags": 345
                    },
                    "datetime": "2023-06-05T00:00:00Z"
                    },
                    {
                    "value": {
                        "tracked_shapes": 123,
                        "shapes": 234,
                        "tags": 345
                    },
                    "datetime": "2023-06-06T00:00:00Z"
                    }
                ],
                "deleted": [
                    {
                    "value": {
                        "tracked_shapes": 123,
                        "shapes": 234,
                        "tags": 345
                    },
                    "datetime": "2023-06-05T00:00:00Z"
                    },
                    {
                    "value": {
                        "tracked_shapes": 123,
                        "shapes": 234,
                        "tags": 345
                    },
                    "datetime": "2023-06-06T00:00:00Z"
                    }
                ]
            }
            },
            "working_time": {
            "title": "Some Title",
            "description": "Detailed description",
            "granularity": "day",
            "dafault_view": "histogram",
            "dataseries": {
                "object_count": [
                {
                    "value": 123,
                    "datetime": "2023-06-05T00:00:00Z"
                },
                {
                    "value": 123,
                    "datetime": "2023-06-06T00:00:00Z"
                }
                ],
                "working_time": [
                {
                    "value": 123,
                    "datetime": "2023-06-05T00:00:00Z"
                },
                {
                    "value": 123,
                    "datetime": "2023-06-06T00:00:00Z"
                }
                ]
            }
            },
            "annotation_time": {
            "title": "Some Title",
            "description": "Detailed description",
            "dafault_view": "numeric",
            "dataseries": {
                "total_annotating_time": [
                {
                    "value": 123,
                    "datetime": "2023-06-06T00:00:00Z"
                }
                ]
            }
            }
        }
        }

        return Response(data=moc_data, status=status.HTTP_200_OK)
