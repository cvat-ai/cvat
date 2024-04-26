# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# NOTE: importing in the utils.py header leads to circular importing

from typing import Optional, Type

from django.db.models.query import QuerySet
from django.http.request import HttpRequest
from django.http.response import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.viewsets import GenericViewSet
from drf_spectacular.utils import extend_schema

from cvat.apps.engine.mixins import UploadMixin
from cvat.apps.engine.models import CloudStorage as CloudStorageModel
from cvat.apps.engine.parsers import TusUploadParser
from cvat.apps.engine.permissions import CloudStoragePermission


def make_paginated_response(
    queryset: QuerySet,
    *,
    viewset: GenericViewSet,
    response_type: Optional[Type[HttpResponse]] = None,
    serializer_type: Optional[Type[Serializer]] = None,
    request: Optional[Type[HttpRequest]] = None,
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

def list_action(serializer_class: Type[Serializer], **kwargs):
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

def get_cloud_storage_for_import_or_export(
    storage_id: int, *, request, is_default: bool = False
) -> CloudStorageModel:
    perm = CloudStoragePermission.create_scope_view(None, storage_id=storage_id, request=request)
    result = perm.check_access()
    if not result.allow:
        if is_default:
            # In this case, the user did not specify the location explicitly
            error_message = "A cloud storage is selected as the default location. "
        else:
            error_message = ""
        error_message += "You don't have access to this cloud storage"
        raise PermissionDenied(error_message)

    return get_object_or_404(CloudStorageModel, pk=storage_id)

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
