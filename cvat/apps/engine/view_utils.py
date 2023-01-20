# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# NOTE: importing in the header leads to circular importing
from typing import Optional, Type
from django.db.models.query import QuerySet
from django.http.request import HttpRequest
from django.http.response import HttpResponse
from rest_framework.serializers import Serializer
from rest_framework.viewsets import GenericViewSet

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
        from rest_framework.response import Response
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
