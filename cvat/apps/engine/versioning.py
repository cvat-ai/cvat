# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.versioning import AcceptHeaderVersioning

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
        return super().determine_version(request, *args, **kwargs)
