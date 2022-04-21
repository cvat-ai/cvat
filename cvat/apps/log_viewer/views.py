# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.http import HttpResponsePermanentRedirect
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class LogViewerAccessViewSet(viewsets.ViewSet):
    serializer_class = None

    def list(self, request):
        return Response(status=status.HTTP_200_OK)

    # All log view requests are proxied by Traefik in production mode which is not available in debug mode,
    # In order not to duplicate settings, let's just redirect to the default page in debug mode
    @action(detail=False, url_path='app/kibana')
    def redirect(self, request):
        if settings.DEBUG:
            return HttpResponsePermanentRedirect('http://localhost:5601/app/kibana')
