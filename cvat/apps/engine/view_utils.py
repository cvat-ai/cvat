# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# NOTE: importing in the utils.py header leads to circular importing

import textwrap
from datetime import datetime
from typing import Optional

from django.db.models.query import QuerySet
from django.http import HttpResponseGone
from django.http.response import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.viewsets import GenericViewSet

from cvat.apps.engine.mixins import UploadMixin
from cvat.apps.engine.parsers import TusUploadParser
from cvat.apps.engine.types import ExtendedRequest


def make_paginated_response(
    queryset: QuerySet,
    *,
    viewset: GenericViewSet,
    response_type: Optional[type[HttpResponse]] = None,
    serializer_type: Optional[type[Serializer]] = None,
    request: Optional[type[ExtendedRequest]] = None,
    **serializer_params
):
    # Adapted from the mixins.ListModelMixin.list()

    serializer_params.setdefault('many', True)

    if response_type is None:
        response_type = Response

    if request is None:
        request = getattr(viewset, 'request', None)

    if request is not None:
        context = serializer_params.setdefault('context', {})
        context.setdefault('request', request)

    if serializer_type is None:
        serializer_type = viewset.get_serializer

    page = viewset.paginate_queryset(queryset)
    if page is not None:
        serializer = serializer_type(page, **serializer_params)
        return viewset.get_paginated_response(serializer.data)

    serializer = serializer_type(queryset, **serializer_params)

    return response_type(serializer.data)

def list_action(serializer_class: type[Serializer], **kwargs):
    params = dict(
        detail=True,
        methods=["GET"],
        serializer_class=serializer_class,

        # Restore the default pagination
        pagination_class=GenericViewSet.pagination_class,

        # Remove the regular list() parameters from the swagger schema.
        # Unset, they would be taken from the enclosing class, which is wrong.
        # https://drf-spectacular.readthedocs.io/en/latest/faq.html#my-action-is-erroneously-paginated-or-has-filter-parameters-that-i-do-not-want
        filter_fields=None, search_fields=None, ordering_fields=None, simple_filters=None
    )
    params.update(kwargs)

    return action(**params)


def tus_chunk_action(*, detail: bool, suffix_base: str):
    def decorator(f):
        f = action(detail=detail, methods=['HEAD', 'PATCH'],
            url_path=f'{suffix_base}/{UploadMixin.file_id_regex}',
            parser_classes=[TusUploadParser],
            serializer_class=None,
        )(f)

        # tus chunk endpoints are never accessed directly (the client must
        # access them by following the Location header from the response to
        # the creation endpoint). Moreover, the details of how these endpoints
        # work are already described by the tus specification. Since we don't
        # need to document either where these points are or how they work,
        # they don't need to be in the schema.
        f = extend_schema(exclude=True)(f)

        return f

    return decorator

def get_410_response_for_export_api(path: str) -> HttpResponseGone:
    return HttpResponseGone(textwrap.dedent(f"""\
        This endpoint is no longer supported.
        To initiate the export process, use POST {path}.
        To check the process status, use GET /api/requests/rq_id,
        where rq_id is obtained from the response of the previous request.
        To download the prepared file, use the result_url obtained from the response of the previous request.
    """))

def get_410_response_when_checking_process_status(process_type: str, /) -> HttpResponseGone:
    return HttpResponseGone(textwrap.dedent(f"""\
        This endpoint no longer supports checking the status of the {process_type} process.
        The common requests API should be used instead: GET /api/requests/rq_id,
        where rq_id is obtained from the response of the initializing request.
    """))

class DeprecatedResponse(Response):
    def __init__(self,
        data=None,
        status=None,
        template_name=None,
        headers=None,
        exception=False,
        content_type=None,
        *,
        deprecation_date: datetime,
    ):
        headers = headers or {}
        # https://greenbytes.de/tech/webdav/draft-ietf-httpapi-deprecation-header-latest.html#the-deprecation-http-response-header-field
        deprecation_timestamp = int(deprecation_date.timestamp())
        headers["Deprecation"] = f"@{deprecation_timestamp}"

        super().__init__(data, status, template_name, headers, exception, content_type)
