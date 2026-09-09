# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import OpenApiParameter
from rest_framework.filters import BaseFilterBackend

ORG_SLUG_PARAM_DESCRIPTION = """\
Organization unique slug.
If omitted, results from all organizations available to the user are returned
(unfiltered). An empty value ("") selects the personal sandbox workspace only.
A non-empty value selects that organization.
"""

ORG_ID_PARAM_DESCRIPTION = """\
Organization unique id.
If omitted, results from all organizations available to the user are returned
(unfiltered). An empty value ("") selects the personal sandbox workspace only.
A positive integer selects that organization.
"""


ORGANIZATION_OPEN_API_PARAMETERS = [
    OpenApiParameter(
        name="org",
        type=str,
        required=False,
        location=OpenApiParameter.QUERY,
        description=ORG_SLUG_PARAM_DESCRIPTION,
        allow_blank=True,
    ),
    OpenApiParameter(
        name="org_id",
        type=int,
        required=False,
        location=OpenApiParameter.QUERY,
        description=ORG_ID_PARAM_DESCRIPTION,
        allow_blank=True,
    ),
    OpenApiParameter(
        name="X-Organization",
        type=str,
        required=False,
        location=OpenApiParameter.HEADER,
        description=ORG_SLUG_PARAM_DESCRIPTION,
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

            if parameter.type is int:
                parameter_type = "integer"
            elif parameter.type is str:
                parameter_type = "string"

            param = {
                "name": parameter.name,
                "in": parameter.location,
                "description": parameter.description,
                "schema": {"type": parameter_type},
            }

            # allowEmptyValue is deprecated in OpenAPI 3: https://spec.openapis.org/oas/v3.0.3.html
            # We use it here to show the option to pass an empty value in the Swagger UI.
            # The empty value has been used in CVAT for quite a while already,
            # and removing it is expected to be a huge breaking change to the API.
            if parameter.allow_blank:
                param["allowEmptyValue"] = True

            parameters.append(param)

        return parameters
