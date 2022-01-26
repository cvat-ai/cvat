# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class LogViewerAccessViewSet(viewsets.ViewSet):
    serializer_class = None

    @action(detail=False, methods=['GET'])
    def access(self, request):
        if settings.DEBUG:
            # All log view requests are proxied by Traefik in production mode which is not available in debug mode,
            # In order not to duplicate settings, let's just redirect to the default page in debug mode
            return HttpResponseRedirect('http://localhost:5601')

        return Response(status=status.HTTP_200_OK)
