# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import OpenApiParameter
from rest_framework.filters import BaseFilterBackend

ORGANIZATION_OPEN_API_PARAMETERS = [
    OpenApiParameter(
        name="org",
        type=str,
        required=False,
        location=OpenApiParameter.QUERY,
        description="Organization unique slug",
    ),
    OpenApiParameter(
        name="org_id",
        type=int,
        required=False,
        location=OpenApiParameter.QUERY,
        description="Organization identifier",
    ),
    OpenApiParameter(
        name="X-Organization",
        type=str,
        required=False,
        location=OpenApiParameter.HEADER,
        description="Organization unique slug",
    ),
]


class OrganizationFilterBackend(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        if view.detail or not view.iam_supports_organization_params:
            return queryset

        # The actual filtering logic must be implemented in the Rego policy files for each endpoint
        # using the add_organization_filter function. Here we just verify that this was done
        # by adding a no-op filter that will crash if add_organization_filter wasn't used.
        return queryset.filter(org_filter_proof=True)

    def get_schema_operation_parameters(self, view):
        if not view.iam_supports_organization_params or view.detail:
            return []

        parameters = []
        for parameter in ORGANIZATION_OPEN_API_PARAMETERS:
            parameter_type = None

            if parameter.type == int:
                parameter_type = "integer"
            elif parameter.type == str:
                parameter_type = "string"

            parameters.append(
                {
                    "name": parameter.name,
                    "in": parameter.location,
                    "description": parameter.description,
                    "schema": {"type": parameter_type},
                }
            )

        return parameters
