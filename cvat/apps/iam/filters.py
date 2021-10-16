# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import coreapi
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
        # Open Policy Agent is responsible for all necessary filtration
        return queryset
