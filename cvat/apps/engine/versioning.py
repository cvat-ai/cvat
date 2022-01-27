# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.versioning import AcceptHeaderVersioning
from rest_framework.exceptions import NotAcceptable

class CustomAcceptHeaderVersioning(AcceptHeaderVersioning):
    """
    GET /api/something/ HTTP/1.1
    Host: localhost:8080
    Accept: application/vnd.cvat.v1.0+json
    """

    def determine_version(self, request, *args, **kwargs):
        version = self._parse_version(request.accepted_media_type)
        if not self.is_allowed_version(version):
            raise NotAcceptable(self.invalid_version_message)

    def _parse_version(self, media_type):
        try:
            version = media_type.split('vnd.cvat')[1].split('+')[0].split('v')[1]
        except Exception:
            version = None
        return version
