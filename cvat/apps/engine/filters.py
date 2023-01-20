# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any, Dict, Iterator, Optional
from functools import reduce
import operator
import json

from django.db.models import Q
from django.db.models.query import QuerySet
from django.utils.translation import gettext_lazy as _
from django.utils.encoding import force_str
from rest_framework import filters
from rest_framework.compat import coreapi, coreschema
from rest_framework.exceptions import ValidationError

DEFAULT_FILTER_FIELDS_ATTR = 'filter_fields'
DEFAULT_LOOKUP_MAP_ATTR = 'lookup_fields'

def get_lookup_fields(view, fields: Optional[Iterator[str]] = None) -> Dict[str, str]:
    if fields is None:
        fields = getattr(view, DEFAULT_FILTER_FIELDS_ATTR, None) or []

    lookup_overrides = getattr(view, DEFAULT_LOOKUP_MAP_ATTR, None) or {}
    lookup_fields = {
        field: lookup_overrides.get(field, field)
        for field in fields
    }
    return lookup_fields


class SearchFilter(filters.SearchFilter):
    def get_search_fields(self, view, request):
        search_fields = getattr(view, 'search_fields') or []
        return get_lookup_fields(view, search_fields).values()

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
        ordering_fields = [v[0] for v in ordering_fields]
        return get_lookup_fields(view, ordering_fields)

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
    Rules = Dict[str, Any]
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

    def _parse_query(self, json_rules: str) -> Rules:
        try:
            rules = json.loads(json_rules)
            if not len(rules):
                raise ValidationError(f"filter shouldn't be empty")
        except json.decoder.JSONDecodeError:
            raise ValidationError(f'filter: Json syntax should be used')

        return rules

    def apply_filter(self,
        queryset: QuerySet, parsed_rules: Rules, *, lookup_fields: Dict[str, Any]
    ) -> QuerySet:
        try:
            q_object = self._build_Q(parsed_rules, lookup_fields)
        except KeyError as ex:
            raise ValidationError(f'filter: {str(ex)} term is not supported')

        return queryset.filter(q_object)

    def filter_queryset(self, request, queryset, view):
        json_rules = request.query_params.get(self.filter_param)
        if json_rules:
            parsed_rules = self._parse_query(json_rules)
            lookup_fields = self._get_lookup_fields(view)
            queryset = self.apply_filter(queryset, parsed_rules, lookup_fields=lookup_fields)

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

    def _get_lookup_fields(self, view):
        return get_lookup_fields(view)


class SimpleFilter(filters.BaseFilterBackend):
    """
    A simple filter, useful for small search queries and manually-edited
    requests.

    Argument types are numbers and strings. The only available check is
    equality for numbers and case-independent inclusion for strings.
    Operators are not supported (e.g. or, less, greater, not etc.).
    Multiple filters are joined with '&' as separate query params.
    """

    filter_desc = _('A simple equality filter for the {field_name} field')
    reserved_names = (
        JsonLogicFilter.filter_param,
        OrderingFilter.ordering_param,
        SearchFilter.search_param,
    )

    filter_fields_attr = 'simple_filters'

    def _build_rules(self, query_params: Dict[str, Any]) -> JsonLogicFilter.Rules:
        field_rules = []
        rules = {"and": field_rules}
        for field, value in query_params.items():
            field_rules.append({"==": [{"var": field}, value]})
        return rules

    def filter_queryset(self, request, queryset, view):
        lookup_fields = self.get_lookup_fields(view)
        query_params = {
            k: request.query_params[k] for k in lookup_fields if k in request.query_params
        }

        if query_params:
            json_filter = JsonLogicFilter()
            rules = self._build_rules(query_params)
            queryset = json_filter.apply_filter(queryset, rules, lookup_fields=lookup_fields)

        return queryset

    def get_lookup_fields(self, view):
        simple_filters = getattr(view, self.filter_fields_attr, None)
        for k in self.reserved_names:
            assert k not in simple_filters, f"Field '{k}' is reserved"

        return get_lookup_fields(view, fields=simple_filters)

    def get_schema_fields(self, view):
        assert coreapi is not None, 'coreapi must be installed to use `get_schema_fields()`'
        assert coreschema is not None, 'coreschema must be installed to use `get_schema_fields()`'

        lookup_fields = self.get_lookup_fields(view)

        return [
            coreapi.Field(
                name=field_name,
                location='query',
                schema={
                    'type': 'string',
                }
            ) for field_name in lookup_fields
        ]

    def get_schema_operation_parameters(self, view):
        lookup_fields = self.get_lookup_fields(view)

        parameters = []
        for field_name in lookup_fields:
            parameters.append({
                'name': field_name,
                'in': 'query',
                'description': force_str(self.filter_desc.format_map({'field_name': field_name})),
                'schema': {
                    'type': 'string',
                },
            })
        return parameters
