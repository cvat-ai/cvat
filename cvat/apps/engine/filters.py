# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import operator
from collections.abc import Iterable, Iterator
from functools import reduce
from textwrap import dedent
from typing import Any, Optional

from django.db.models import Q
from django.db.models.query import QuerySet
from django.utils.encoding import force_str
from django.utils.translation import gettext_lazy as _
from django_filters import FilterSet
from django_filters import filters as djf
from django_filters.filterset import BaseFilterSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.compat import coreapi, coreschema
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request

DEFAULT_FILTER_FIELDS_ATTR = 'filter_fields'
DEFAULT_LOOKUP_MAP_ATTR = 'lookup_fields'

def get_lookup_fields(view, fields: Optional[Iterator[str]] = None) -> dict[str, str]:
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
            f' Available search_fields: {search_fields}'

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
        ] if search_fields else []

    def get_schema_operation_parameters(self, view):
        search_fields = getattr(view, 'search_fields', [])
        full_description = self.search_description + \
            f' Available search_fields: {search_fields}'

        return [{
            'name': self.search_param,
            'required': False,
            'in': 'query',
            'description': force_str(full_description),
            'schema': {
                'type': 'string',
            },
        }] if search_fields else []

class OrderingFilter(filters.OrderingFilter):
    ordering_param = 'sort'
    reverse_flag = "-"

    def get_ordering(self, request, queryset, view):
        ordering = []
        lookup_fields = self._get_lookup_fields(request, queryset, view)
        for term in super().get_ordering(request, queryset, view):
            flag = ''
            if term.startswith(self.reverse_flag):
                flag = self.reverse_flag
                term = term[len(flag):]
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
            f' Available ordering_fields: {ordering_fields}'

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
        ] if ordering_fields else []

    def get_schema_operation_parameters(self, view):
        ordering_fields = getattr(view, 'ordering_fields', [])
        full_description = self.ordering_description + \
            f' Available ordering_fields: {ordering_fields}'

        return [{
            'name': self.ordering_param,
            'required': False,
            'in': 'query',
            'description': force_str(full_description),
            'schema': {
                'type': 'string',
            },
        }] if ordering_fields else []

class JsonLogicFilter(filters.BaseFilterBackend):
    Rules = dict[str, Any]
    filter_param = 'filter'
    filter_title = _('Filter')
    filter_description = _(dedent("""
        JSON Logic filter. This filter can be used to perform complex filtering by grouping rules.\n
        For example, using such a filter you can get all resources created by you:\n
            - {"and":[{"==":[{"var":"owner"},"<user>"]}]}\n
        Details about the syntax used can be found at the link: https://jsonlogic.com/\n
    """))

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
        queryset: QuerySet, parsed_rules: Rules, *, lookup_fields: dict[str, Any]
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
        filter_description = getattr(view, 'filter_description', '')
        full_description = self.filter_description + \
            f' Available filter_fields: {filter_fields}.' + filter_description

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
        ] if filter_fields else []

    def get_schema_operation_parameters(self, view):
        filter_fields = getattr(view, 'filter_fields', [])
        filter_description = getattr(view, 'filter_description', '')
        full_description = self.filter_description + \
            f' Available filter_fields: {filter_fields}.' + filter_description
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
        ] if filter_fields else []

    def _get_lookup_fields(self, view):
        return get_lookup_fields(view)


class SimpleFilter(DjangoFilterBackend):
    """
    A simple filter, useful for small search queries and manually-edited
    requests.

    Argument types are numbers and strings. The only available check is equality.
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

    class MappingFiltersetBase(BaseFilterSet):
        _filter_name_map_attr = 'filter_names'

        @classmethod
        def get_filter_name(cls, field_name, lookup_expr):
            filter_names = getattr(cls, cls._filter_name_map_attr, {})

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
        if not lookup_fields or queryset is None:
            return None

        MetaBase = getattr(self.filterset_base, 'Meta', object)

        class AutoFilterSet(self.filterset_base, metaclass=FilterSet.__class__):
            filter_names = { v: k for k, v in lookup_fields.items() }

            class Meta(MetaBase): # pylint: disable=useless-object-inheritance
                model = queryset.model
                fields = list(lookup_fields.values())

        return AutoFilterSet

    def get_lookup_fields(self, view):
        simple_filters = getattr(view, self.filter_fields_attr, None)
        if simple_filters:
            for k in self.reserved_names:
                assert k not in simple_filters, \
                    f"Query parameter '{k}' is reserved, try to change the filter name."

        return get_lookup_fields(view, fields=simple_filters)

    def get_schema_operation_parameters(self, view):
        queryset = view.queryset

        filterset_class = self.get_filterset_class(view, queryset)
        if not filterset_class:
            return []

        parameters = []
        for field_name, filter_ in filterset_class.base_filters.items():
            if isinstance(filter_, djf.BooleanFilter):
                parameter_schema = { 'type': 'boolean' }
            elif isinstance(filter_, (djf.NumberFilter, djf.ModelChoiceFilter)):
                parameter_schema = { 'type': 'integer' }
            elif isinstance(filter_, (djf.CharFilter, djf.ChoiceFilter)):
                # Choices use their labels as filter values
                parameter_schema = { 'type': 'string' }
            else:
                raise Exception("Filter field '{}' type '{}' is not supported".format(
                    '.'.join([view.basename, view.action, field_name]),
                    filter_
                ))

            parameter = {
                'name': field_name,
                'in': 'query',
                'description': force_str(self.filter_desc.format_map({
                    'field_name': filter_.label if filter_.label is not None else field_name
                })),
                'schema': parameter_schema,
            }
            if filter_.extra and 'choices' in filter_.extra:
                parameter['schema']['enum'] = [c[0] for c in filter_.extra['choices']]
            parameters.append(parameter)
        return parameters


class _NestedAttributeHandler:
    nested_attribute_separator = '.'

    class DotDict(dict):
        """recursive dot.notation access to dictionary attributes"""
        __getattr__ = dict.get
        __setattr__ = dict.__setitem__
        __delattr__ = dict.__delitem__

        def __init__(self, dct: dict):
            for key, value in dct.items():
                if isinstance(value, dict):
                    value = self.__class__(value)
                self[key] = value

    def get_nested_attr(self, obj: Any, nested_attr_path: str) -> Any:
        result = obj
        for attribute in nested_attr_path.split(self.nested_attribute_separator):
            if isinstance(result, dict):
                result = self.DotDict(result)
            result = getattr(result, attribute)

        if callable(result):
            result = result()

        return result

class NonModelSimpleFilter(SimpleFilter, _NestedAttributeHandler):
    """
    A simple filter backend for non-model views, useful for small search queries and manually-edited
    requests.

    Argument types are numbers and strings. The only available check is equality.
    Operators are not supported (e.g. or, less, greater, not etc.).
    """

    def get_schema_operation_parameters(self, view):
        simple_filters = getattr(view, self.filter_fields_attr, None)
        simple_filters_schema = getattr(view, 'simple_filters_schema', None)

        parameters = []
        if simple_filters and simple_filters_schema:
            for filter_name in simple_filters:
                filter_type, filter_choices = simple_filters_schema[filter_name]
                parameter = {
                    'name': filter_name,
                    'in': 'query',
                    'description': force_str(self.filter_desc.format_map({
                        'field_name': filter_name
                    })),
                    'schema': {
                        'type': filter_type
                    },
                }
                if filter_choices:
                    parameter['schema']['enum'] = [c[0] for c in filter_choices]
                parameters.append(parameter)
        return parameters

    def filter_queryset(self, request: Request, queryset: Iterable, view):
        filtered_queryset = queryset

        query_params = request.query_params
        filters_to_use = set(query_params.keys())

        simple_filters = getattr(view, self.filter_fields_attr, None)
        lookup_fields = self.get_lookup_fields(view)

        if simple_filters and lookup_fields and (intersection := filters_to_use & set(simple_filters)):
            filtered_queryset = []

            for obj in queryset:
                fits_filter = False
                for field in intersection:
                    query_param = query_params[field]

                    if query_param.isdigit():
                        query_param = int(query_param)

                    # replace empty string with None
                    if field == 'org' and not query_param:
                        query_param = None

                    fits_filter = self.get_nested_attr(obj, lookup_fields[field]) == query_param
                    if not fits_filter:
                        break

                if fits_filter:
                    filtered_queryset.append(obj)

        return filtered_queryset

class NonModelOrderingFilter(OrderingFilter, _NestedAttributeHandler):
    """Ordering filter for non-model views.
    This filter backend supports the following syntaxes:
    ?sort=field
    ?sort=-field
    ?sort=field1,field2
    ?sort=-field1,-field2
    """

    def get_ordering(self, request, queryset, view) -> tuple[list[str], bool]:
        ordering = super().get_ordering(request, queryset, view)
        result, reverse = [], False
        for field in ordering:
            if field.startswith(self.reverse_flag):
                reverse = True
                field = field[len(self.reverse_flag):]
            result.append(field)

        return result, reverse

    def filter_queryset(self, request: Request, queryset: Iterable, view) -> Iterable:
        ordering, reverse = self.get_ordering(request, queryset, view)

        if ordering:
            return sorted(queryset, key=lambda obj: [self.get_nested_attr(obj, field) for field in ordering], reverse=reverse)

        return queryset


class NonModelJsonLogicFilter(JsonLogicFilter, _NestedAttributeHandler):
    filter_description = _(dedent("""
        JSON Logic filter. This filter can be used to perform complex filtering by grouping rules.\n
        Details about the syntax used can be found at the link: https://jsonlogic.com/\n
    """))

    def _apply_filter(self, rules, lookup_fields, obj):
        op, args = next(iter(rules.items()))
        if op in ['or', 'and']:
            return reduce({
                'or': any,
                'and': all,
            }[op], [self._apply_filter(arg, lookup_fields, obj) for arg in args])
        elif op == '!':
            return not self._apply_filter(args, lookup_fields, obj)
        elif op == 'var':
            var = lookup_fields[args]
            var_value = self.get_nested_attr(obj, var)
            return var_value is not None
        elif op in ['!=', '==', '<', '>', '<=', '>='] and len(args) == 2:
            var = lookup_fields[args[0]['var']]
            var_value = self.get_nested_attr(obj, var)
            return {
                '!=': operator.ne,
                '==': operator.eq,
                '<': operator.lt,
                '<=': operator.le,
                '>': operator.gt,
                '>=': operator.ge,
            }[op](var_value, args[1])
        elif op == 'in':
            if isinstance(args[0], dict):
                var = lookup_fields[args[0]['var']]
                var_value = self.get_nested_attr(obj, var)
                return operator.contains(args[1], var_value)
            else:
                var = lookup_fields[args[1]['var']]
                var_value = self.get_nested_attr(obj, var)
                return operator.contains(args[0], var_value)
        elif op == '<=' and len(args) == 3:
            var = lookup_fields[args[1]['var']]
            var_value = self.get_nested_attr(obj, var)
            return var_value >= args[0] and var_value <= args[2]
        else:
            raise ValidationError(f'filter: {op} operation with {args} arguments is not implemented')

    def filter_queryset(self, request: Request, queryset: Iterable, view) -> Iterable:
        filtered_queryset = queryset
        json_rules = request.query_params.get(self.filter_param)
        if json_rules:
            filtered_queryset = []
            parsed_rules = self._parse_query(json_rules)
            lookup_fields = self._get_lookup_fields(view)

            for obj in queryset:
                fits_filter = self._apply_filter(parsed_rules, lookup_fields, obj)
                if fits_filter:
                    filtered_queryset.append(obj)

        return filtered_queryset
