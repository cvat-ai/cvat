# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager
from typing import Any, Dict
from functools import reduce
from unittest.mock import patch
import operator
import json

from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from django.utils.encoding import force_str
from django_filters.filterset import BaseFilterSet
from rest_framework import filters
from rest_framework.compat import coreapi, coreschema
from rest_framework.exceptions import ValidationError
from django_filters import FilterSet
from django_filters.rest_framework import DjangoFilterBackend


def get_lookup_fields(view, filter_fields=None) -> Dict[str, str]:
    if filter_fields is None:
        filter_fields = getattr(view, 'filter_fields', [])

    if not filter_fields:
        return {}

    lookup_fields = {field:field for field in filter_fields}
    lookup_fields.update(getattr(view, 'lookup_fields', {}))

    return lookup_fields

@contextmanager
def _patched_attr(obj: Any, name: str, value: Any) -> None:
    with patch.object(obj, attribute=name, new=value, create=True):
        yield

class SearchFilter(filters.SearchFilter):
    def get_search_fields(self, view, request):
        search_fields = getattr(view, 'search_fields') or []
        lookup_fields = {field:field for field in search_fields}
        view_lookup_fields = getattr(view, 'lookup_fields', {})
        keys_to_update = set(search_fields) & set(view_lookup_fields.keys())
        for key in keys_to_update:
            lookup_fields[key] = view_lookup_fields[key]

        return lookup_fields.values()

    def get_schema_fields(self, view):
        assert coreapi is not None, 'coreapi must be installed to use `get_schema_fields()`'
        assert coreschema is not None, 'coreschema must be installed to use `get_schema_fields()`'

        search_fields = getattr(view, 'search_fields', [])
        full_description = self.search_description + \
            f' Avaliable search_fields: {search_fields}'

        return [
            coreapi.Field(
                name=self.search_param,
                required=False,
                location='query',
                schema=coreschema.String(
                    title=force_str(self.search_title),
                    description=force_str(full_description)
                )
            )
        ]

    def get_schema_operation_parameters(self, view):
        search_fields = getattr(view, 'search_fields', [])
        full_description = self.search_description + \
            f' Avaliable search_fields: {search_fields}'

        return [{
            'name': self.search_param,
            'required': False,
            'in': 'query',
            'description': force_str(full_description),
            'schema': {
                'type': 'string',
            },
        }]

class OrderingFilter(filters.OrderingFilter):
    ordering_param = 'sort'
    def get_ordering(self, request, queryset, view):
        ordering = []
        lookup_fields = self._get_lookup_fields(request, queryset, view)
        for term in super().get_ordering(request, queryset, view):
            flag = ''
            if term.startswith("-"):
                flag = '-'
                term = term[1:]
            ordering.append(flag + lookup_fields[term])

        return ordering

    def _get_lookup_fields(self, request, queryset, view):
        ordering_fields = self.get_valid_fields(queryset, view, {'request': request})
        lookup_fields = {field:field for field, _ in ordering_fields}
        lookup_fields.update(getattr(view, 'lookup_fields', {}))

        return lookup_fields

    def get_schema_fields(self, view):
        assert coreapi is not None, 'coreapi must be installed to use `get_schema_fields()`'
        assert coreschema is not None, 'coreschema must be installed to use `get_schema_fields()`'

        ordering_fields = getattr(view, 'ordering_fields', [])
        full_description = self.ordering_description + \
            f' Avaliable ordering_fields: {ordering_fields}'

        return [
            coreapi.Field(
                name=self.ordering_param,
                required=False,
                location='query',
                schema=coreschema.String(
                    title=force_str(self.ordering_title),
                    description=force_str(full_description)
                )
            )
        ]

    def get_schema_operation_parameters(self, view):
        ordering_fields = getattr(view, 'ordering_fields', [])
        full_description = self.ordering_description + \
            f' Avaliable ordering_fields: {ordering_fields}'

        return [{
            'name': self.ordering_param,
            'required': False,
            'in': 'query',
            'description': force_str(full_description),
            'schema': {
                'type': 'string',
            },
        }]

class JsonLogicFilter(filters.BaseFilterBackend):
    filter_param = 'filter'
    filter_title = _('Filter')
    filter_description = _('A filter term.')

    def _build_Q(self, rules, lookup_fields):
        op, args = next(iter(rules.items()))
        if op in ['or', 'and']:
            return reduce({
                'or': operator.or_,
                'and': operator.and_
            }[op], [self._build_Q(arg, lookup_fields) for arg in args])
        elif op == '!':
            return ~self._build_Q(args, lookup_fields)
        elif op == '!!':
            return self._build_Q(args, lookup_fields)
        elif op == 'var':
            return Q(**{args + '__isnull': False})
        elif op in ['==', '<', '>', '<=', '>='] and len(args) == 2:
            var = lookup_fields[args[0]['var']]
            q_var = var + {
                '==': '',
                '<': '__lt',
                '<=': '__lte',
                '>': '__gt',
                '>=': '__gte'
            }[op]
            return Q(**{q_var: args[1]})
        elif op == 'in':
            if isinstance(args[0], dict):
                var = lookup_fields[args[0]['var']]
                return Q(**{var + '__in': args[1]})
            else:
                var = lookup_fields[args[1]['var']]
                return Q(**{var + '__contains': args[0]})
        elif op == '<=' and len(args) == 3:
            var = lookup_fields[args[1]['var']]
            return Q(**{var + '__gte': args[0]}) & Q(**{var + '__lte': args[2]})
        else:
            raise ValidationError(f'filter: {op} operation with {args} arguments is not implemented')

    def filter_queryset(self, request, queryset, view):
        json_rules = request.query_params.get(self.filter_param)
        if json_rules:
            try:
                rules = json.loads(json_rules)
                if not len(rules):
                    raise ValidationError(f"filter shouldn't be empty")
            except json.decoder.JSONDecodeError:
                raise ValidationError(f'filter: Json syntax should be used')
            lookup_fields = self._get_lookup_fields(request, view)
            try:
                q_object = self._build_Q(rules, lookup_fields)
            except KeyError as ex:
                raise ValidationError(f'filter: {str(ex)} term is not supported')
            return queryset.filter(q_object)

        return queryset

    def get_schema_fields(self, view):
        assert coreapi is not None, 'coreapi must be installed to use `get_schema_fields()`'
        assert coreschema is not None, 'coreschema must be installed to use `get_schema_fields()`'

        filter_fields = getattr(view, 'filter_fields', [])
        full_description = self.filter_description + \
            f' Avaliable filter_fields: {filter_fields}'

        return [
            coreapi.Field(
                name=self.filter_param,
                required=False,
                location='query',
                schema=coreschema.String(
                    title=force_str(self.filter_title),
                    description=force_str(full_description)
                )
            )
        ]

    def get_schema_operation_parameters(self, view):
        filter_fields = getattr(view, 'filter_fields', [])
        full_description = self.filter_description + \
            f' Avaliable filter_fields: {filter_fields}'
        return [
            {
                'name': self.filter_param,
                'required': False,
                'in': 'query',
                'description': force_str(full_description),
                'schema': {
                    'type': 'string',
                },
            },
        ]

    def _get_lookup_fields(self, request, view):
        return get_lookup_fields(view)


class SimpleFilter(DjangoFilterBackend):
    """
    A simple filter, useful for small search queries and manually-edited
    requests.

    The only available check is equality.
    Multiple terms are joined with '&'.
    Other operators are not supported (e.g. or, less, greater, not etc.).
    Argument types are numbers and strings.
    """

    filter_desc = _('A simple equality filter for the {field_name} field')
    reserved_names = (
        JsonLogicFilter.filter_param,
        OrderingFilter.ordering_param,
        SearchFilter.search_param,
    )

    class MappingFiltersetBase(BaseFilterSet):
        @classmethod
        def get_filter_name(cls, field_name, lookup_expr):
            filter_names = getattr(cls, 'filter_names', {})

            field_name = super().get_filter_name(field_name, lookup_expr)

            if filter_names:
                # Map names after a lookup suffix is applied to allow
                # mapping specific filters with lookups
                field_name = filter_names.get(field_name, field_name)

            if field_name in SimpleFilter.reserved_names:
                raise ValueError(f'Field name {field_name} is reserved')

            return field_name

    filterset_base = MappingFiltersetBase


    def get_filterset_class(self, view, queryset=None):
        lookup_fields = self.get_lookup_fields(view)
        if not lookup_fields or not queryset:
            return None

        MetaBase = getattr(self.filterset_base, 'Meta', object)

        class AutoFilterSet(self.filterset_base, metaclass=FilterSet.__class__):
            filter_names = { v: k for k, v in lookup_fields.items() }

            class Meta(MetaBase):
                model = queryset.model
                fields = list(lookup_fields.values())

        return AutoFilterSet

    def get_lookup_fields(self, view):
        simple_filters = getattr(view, 'simple_filters', None)
        return get_lookup_fields(view, filter_fields=simple_filters)

    def get_filter_fields(self, view):
        return list(self.get_lookup_fields(view))

    def get_schema_fields(self, view):
        assert coreapi is not None, 'coreapi must be installed to use `get_schema_fields()`'
        assert coreschema is not None, 'coreschema must be installed to use `get_schema_fields()`'

        filter_fields = self.get_filter_fields(view)

        return [
            coreapi.Field(
                name=field_name,
                location='query',
                schema={
                    'type': 'string',
                }
            ) for field_name in filter_fields
        ]

    def get_schema_operation_parameters(self, view):
        filter_fields = self.get_filter_fields(view)

        parameters = []
        for field_name in filter_fields:
            parameters.append({
                'name': field_name,
                'in': 'query',
                'description': force_str(self.filter_desc.format_map({'field_name': field_name})),
                'schema': {
                    'type': 'string',
                },
            })
        return parameters
