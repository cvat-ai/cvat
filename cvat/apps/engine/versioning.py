# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.versioning import AcceptHeaderVersioning
from rest_framework.exceptions import NotAcceptable

class CustomAcceptHeaderVersioning(AcceptHeaderVersioning):
    """
    GET /api/something/ HTTP/1.1
    Host: localhost:8080
    Accept: application/vnd.cvat+json; version=1.0
    """

    def determine_version(self, request, *args, **kwargs):
        # it's needed for browsable api
        if request.accepted_media_type in {'text/html', 'application/json'}:
            return 'api-docs'
        try:
            version = super().determine_version(request, *args, **kwargs)
        except NotAcceptable:
            # resource download requests such as backup/annotation files
            if request.query_params.get('action') == 'download':
                version = 'downloading'
            else: raise
        return version
