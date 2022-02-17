# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import filters
from functools import reduce
import operator
import json
from django.db.models import Q
from rest_framework.compat import coreapi, coreschema
from django.utils.translation import gettext_lazy as _
from django.utils.encoding import force_str
from rest_framework.exceptions import ValidationError

class SearchFilter(filters.SearchFilter):
    pass

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
            rules = json.loads(json_rules)
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
        return [
            coreapi.Field(
                name=self.filter_param,
                required=False,
                location='query',
                schema=coreschema.String(
                    title=force_str(self.filter_title),
                    description=force_str(self.filter_description)
                )
            )
        ]

    def get_schema_operation_parameters(self, view):
        return [
            {
                'name': self.filter_param,
                'required': False,
                'in': 'query',
                'description': force_str(self.filter_description),
                'schema': {
                    'type': 'string',
                },
            },
        ]

    def _get_lookup_fields(self, request, view):
        filter_fields = getattr(view, 'filter_fields', [])
        lookup_fields = {field:field for field in filter_fields}
        lookup_fields.update(getattr(view, 'lookup_fields', {}))

        return lookup_fields
