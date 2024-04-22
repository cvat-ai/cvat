# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.parsers import BaseParser

class TusUploadParser(BaseParser):
    # The media type is sent by TUS protocol (tus.io) for uploading files
    media_type = 'application/offset+octet-stream'

    def parse(self, stream, media_type=None, parser_context=None):
        # Let's just return empty dictionary which will be used for
        # request.data. Otherwise every access to request.data will lead to
        # exception because a parser for the request with the non-standard
        # content media type isn't defined.
        # https://github.com/imtapps/django-rest-framework/blob/master/docs/api-guide/parsers.md
        return {}
