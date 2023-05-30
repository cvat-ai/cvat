# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.filters import BaseFilterBackend

class OrganizationFilterBackend(BaseFilterBackend):
    organization_slug = 'org'
    organization_slug_description = 'Organization unique slug'
    organization_id = 'org_id'
    organization_id_description = 'Organization identifier'
    organization_slug_header = 'X-Organization'

    def filter_queryset(self, request, queryset, view):
        # Filter works only for "list" requests and allows to return
        # only non-organization objects if org isn't specified

        if view.detail or not view.iam_organization_field:
            return queryset

        visibility = None
        org = request.iam_context['organization']

        if org:
            visibility = {'organization': org.id}

        elif not org and (
            self.organization_slug in request.query_params
            or self.organization_id in request.query_params
            or self.organization_slug_header in request.headers
        ):
            visibility = {'organization': None}

        if visibility:
            visibility[view.iam_organization_field] = visibility.pop('organization')
            return queryset.filter(**visibility).distinct()

        return queryset

    def get_schema_operation_parameters(self, view):
        if not view.iam_organization_field or view.detail:
            return []

        return [
            {
                'name': self.organization_slug,
                'in': 'query',
                'description': self.organization_slug_description,
                'schema': {'type': 'string'},
            },
            {
                'name': self.organization_id,
                'in': 'query',
                'description': self.organization_id_description,
                'schema': {'type': 'integer'},
            },
            {
                'name': self.organization_slug_header,
                'in': 'header',
                'description': self.organization_slug_description,
                'schema': {'type': 'string'},
            },
        ]
