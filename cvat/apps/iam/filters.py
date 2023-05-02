# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.filters import BaseFilterBackend

class OrganizationFilterBackend(BaseFilterBackend):
    organization_slug = 'org'
    organization_slug_description = 'Organization unique slug'
    organization_id = 'org_id'
    organization_id_description = 'Organization identifier'

    def filter_queryset(self, request, queryset, view):
        # Filter works only for "list" requests and allows to return
        # only non-organization objects if org isn't specified

        if view.action != "list":
            return queryset

        visibility = None
        org = request.iam_context["organization"]

        if org:
            visibility = {'organization': org.id}

        elif not org and ('org' in request.query_params or 'org_id' in request.query_params):
            visibility = {'organization': None}

        if visibility and view.iam_organization_field:
            visibility[view.iam_organization_field] = visibility.pop('organization')
            return queryset.filter(**visibility).distinct()

        return queryset
