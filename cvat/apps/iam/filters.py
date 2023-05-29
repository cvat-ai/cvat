#
# SPDX-License-Identifier: MIT

from rest_framework.filters import BaseFilterBackend
from django.db.models import Q

from drf_spectacular.utils import OpenApiParameter

ORGANIZATION_OPEN_API_PARAMETERS = [
    OpenApiParameter(
        name='org',
        type=str,
        required=False,
        location=OpenApiParameter.QUERY,
        description="Organization unique slug",
    ),
    OpenApiParameter(
        name='org_id',
        type=int,
        required=False,
        location=OpenApiParameter.QUERY,
        description="Organization identifier",
    ),
    OpenApiParameter(
        name='X-Organization',
        type=str,
        required=False,
        location=OpenApiParameter.HEADER,
        description="Organization unique slug",
    ),
]

class OrganizationFilterBackend(BaseFilterBackend):

    def _parameter_is_provided(self, request):
        for parameter in ORGANIZATION_OPEN_API_PARAMETERS:
            if parameter.location == 'header' and parameter.name in request.headers:
                return True
            elif parameter.location == 'query' and parameter.name in request.query_params:
                return True
        return False

    def filter_queryset(self, request, queryset, view):
        # Filter works only for "list" requests and allows to return
        # only non-organization objects if org isn't specified

        if view.detail or not view.iam_organization_fields:
            return queryset

        visibility = None
        org = request.iam_context['organization']

        if org:
            visibility = {'organization': org.id}

        elif not org and self._parameter_is_provided(request):
            visibility = {'organization': None}

        if visibility:
            organization = visibility.pop("organization")

            # we select all db records where AT LEAST ONE organization fields is satisfied to query
            operation = Q.OR

            if organization is None:
                # but to get all non-org objects we need select db records where ALL organization fields is None
                operation = Q.AND

            query = Q()
            for org_field in view.iam_organization_fields:
                query.add(Q(**{org_field: organization}), operation)

            return queryset.filter(query).distinct()

        return queryset

    def get_schema_operation_parameters(self, view):
        if not view.iam_organization_fields or view.detail:
            return []

        parameters = []
        for parameter in ORGANIZATION_OPEN_API_PARAMETERS:
            parameter_type = None

            if parameter.type == int:
                parameter_type = 'integer'
            elif parameter.type == str:
                parameter_type = 'string'

            parameters.append({
                'name': parameter.name,
                'in': parameter.location,
                'description': parameter.description,
                'schema': {'type': parameter_type}
            })

        return parameters
