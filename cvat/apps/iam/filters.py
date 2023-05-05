# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django_filters.rest_framework import DjangoFilterBackend

class OrganizationFilterBackend(DjangoFilterBackend):
    organization_slug = 'org'
    organization_slug_description = 'Organization unique slug'
    organization_id = 'org_id'
    organization_id_description = 'Organization identifier'

    def filter_queryset(self, request, queryset, view):
        # Filter works only for "list" requests and allows to return
        # only non-organization objects if org isn't specified

        if view.detail or not view.iam_organization_field:
            return queryset

        visibility = None
        org = request.iam_context["organization"]

        if org:
            visibility = {'organization': org.id}

        elif not org and ('org' in request.query_params or 'org_id' in request.query_params):
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
                'name': 'X-Organization',
                'in': 'header',
                'description': self.organization_slug_description,
                'schema': {'type': 'string'},
            },
        ]
