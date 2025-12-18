# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# NOTE: importing in the utils.py header leads to circular importing

import textwrap
from datetime import datetime
from typing import Any

from django.db.models import Manager, QuerySet
from django.http import HttpResponseGone
from django.http.response import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.viewsets import GenericViewSet

from cvat.apps.engine.model_utils import _ModelT
from cvat.apps.engine.parsers import TusUploadParser
from cvat.apps.engine.tus import TusFile
from cvat.apps.engine.types import ExtendedRequest


def make_paginated_response(
    queryset: QuerySet,
    *,
    viewset: GenericViewSet,
    response_type: type[HttpResponse] | None = None,
    serializer_type: type[Serializer] | None = None,
    request: type[ExtendedRequest] | None = None,
    **serializer_params,
):
    # Adapted from the mixins.ListModelMixin.list()

    serializer_params.setdefault("many", True)

    if response_type is None:
        response_type = Response

    if request is None:
        request = getattr(viewset, "request", None)

    if request is not None:
        context = serializer_params.setdefault("context", {})
        context.setdefault("request", request)

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
        filter_fields=None,
        search_fields=None,
        ordering_fields=None,
        simple_filters=None,
    )
    params.update(kwargs)

    return action(**params)


def tus_chunk_action(*, detail: bool, suffix_base: str):
    def decorator(f):
        f = action(
            detail=detail,
            methods=["HEAD", "PATCH"],
            url_path=f"{suffix_base}/{TusFile.FileID.REGEX}",
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
    return HttpResponseGone(
        textwrap.dedent(
            f"""\
            This endpoint is no longer supported.
            To initiate the export process, use POST {path}.
            To check the process status, use GET /api/requests/rq_id,
            where rq_id is obtained from the response of the previous request.
            To download the prepared file, use the result_url obtained from the response of the previous request.
            """
        )
    )


def get_410_response_when_checking_process_status(process_type: str, /) -> HttpResponseGone:
    return HttpResponseGone(
        textwrap.dedent(
            f"""\
            This endpoint no longer supports checking the status of the {process_type} process.
            The common requests API should be used instead: GET /api/requests/rq_id,
            where rq_id is obtained from the response of the initializing request.
            """
        )
    )


def deprecate_response(response: Response, *, deprecation_date: datetime) -> None:
    # https://www.rfc-editor.org/rfc/rfc9745
    deprecation_timestamp = int(deprecation_date.timestamp())
    response.headers["Deprecation"] = f"@{deprecation_timestamp}"


def get_or_404(
    queryset: type[_ModelT] | QuerySet[_ModelT] | Manager[_ModelT],
    pk: Any,
) -> _ModelT:
    """
    A simpler version of django.shortcuts.get_object_or_404()
    Produces a better error message.
    """

    if hasattr(queryset, "_default_manager"):
        queryset = queryset._default_manager.all()

    model_type = queryset.model

    try:
        return queryset.get(pk=pk)
    except model_type.DoesNotExist as ex:
        readable_model_name = queryset.model._meta.verbose_name.capitalize()
        raise NotFound(f"{readable_model_name} {pk} does not exist") from ex
