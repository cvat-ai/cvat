# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import OpenApiParameter
from rest_framework.filters import BaseFilterBackend

_ORG_PARAM_DESCRIPTION = (
    "Organization unique slug. "
    "If omitted, results from all organizations available to the user are returned "
    "(unfiltered). "
    'An empty value ("") selects the personal sandbox workspace only. '
    "A non-empty value selects that organization."
)

_ORG_ID_PARAM_DESCRIPTION = (
    "Organization identifier. "
    "If omitted, results from all organizations available to the user are returned "
    "(unfiltered). "
    'An empty value ("") selects the personal sandbox workspace only. '
    "A positive integer selects that organization."
)

ORGANIZATION_OPEN_API_PARAMETERS = [
    OpenApiParameter(
        name="org",
        type=str,
        required=False,
        location=OpenApiParameter.QUERY,
        description=_ORG_PARAM_DESCRIPTION,
        allow_blank=True,
    ),
    OpenApiParameter(
        name="org_id",
        type=int,
        required=False,
        location=OpenApiParameter.QUERY,
        description=_ORG_ID_PARAM_DESCRIPTION,
        # Empty values are accepted by the API for sandbox, but integer OpenAPI
        # typing prevents Swagger UI from sending them; use `org=""` instead.
        allow_blank=False,
    ),
    OpenApiParameter(
        name="X-Organization",
        type=str,
        required=False,
        location=OpenApiParameter.HEADER,
        description=_ORG_PARAM_DESCRIPTION,
        allow_blank=True,
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

            param = {
                "name": parameter.name,
                "in": parameter.location,
                "description": parameter.description,
                "schema": {"type": parameter_type},
            }
            # Allow empty values so Swagger UI can request the sandbox context.
            if parameter.allow_blank:
                param["allowEmptyValue"] = True

            parameters.append(param)

        return parameters
