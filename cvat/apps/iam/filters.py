# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import coreapi
from django.core.exceptions import FieldError
from rest_framework.filters import BaseFilterBackend

class OrganizationFilterBackend(BaseFilterBackend):
    def get_schema_fields(self, view):
        return [
            coreapi.Field(name='org', location='query', required=False,
                type='string', description='Organization unique slug'),
            coreapi.Field(name='org_id', location='query', required=False,
                type='string', description='Organization identifier'),
        ]

    def filter_queryset(self, request, queryset, view):
        # Rego rules should filter objects correctly (see filter rule). The
        # filter isn't necessary but it is an extra check that we show only
        # objects inside an organization if the request in context of the
        # organization.
        try:
            organization = request.iam_context['organization']
            if organization:
                return queryset.filter(organization=organization)
            else:
                return queryset
        except FieldError:
            return queryset
