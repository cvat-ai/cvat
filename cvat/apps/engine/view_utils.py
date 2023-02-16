# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# NOTE: importing in the utils.py header leads to circular importing

from typing import Any, Dict, Optional, Type

from django.db.models.query import QuerySet
from django.http.request import HttpRequest
from django.http.response import HttpResponse
from django.utils.http import urlencode
from rest_framework.response import Response
from rest_framework.reverse import reverse as _reverse
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

def reverse(viewname, *, args=None, kwargs=None,
    query_params: Optional[Dict[str, str]] = None,
    request: Optional[HttpRequest] = None,
) -> str:
    """
    The same as rest_framework's reverse(), but adds custom query params support.
    The original request can be passed in the 'request' parameter to
    return absolute URLs.
    """

    url = _reverse(viewname, args, kwargs, request)

    if query_params:
        return f'{url}?{urlencode(query_params)}'

    return url

def build_field_filter_params(field: str, value: Any) -> Dict[str, str]:
    """
    Builds a collection filter query params for a single field and value.
    """
    return { field: value }

def get_list_view_name(model):
    # Implemented after
    # rest_framework/utils/field_mapping.py.get_detail_view_name()
    """
    Given a model class, return the view name to use for URL relationships
    that refer to instances of the model.
    """
    return '%(model_name)s-list' % {
        'model_name': model._meta.object_name.lower()
    }
