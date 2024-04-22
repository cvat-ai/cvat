# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.filters import BaseFilterBackend
from django.db.models import Q
from collections.abc import Iterable

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

    def _construct_filter_query(self, organization_fields, org_id):
        if isinstance(organization_fields, str):
            return Q(**{organization_fields: org_id})

        if isinstance(organization_fields, Iterable):
            # we select all db records where AT LEAST ONE organization field is equal org_id
            operation = Q.OR

            if org_id is None:
                # but to get all non-org objects we need select db records where ALL organization fields are None
                operation = Q.AND

            filter_query = Q()
            for org_field in organization_fields:
                filter_query.add(Q(**{org_field: org_id}), operation)

            return filter_query

        return Q()


    def filter_queryset(self, request, queryset, view):
        # Filter works only for "list" requests and allows to return
        # only non-organization objects if org isn't specified

        if (
            view.detail or not view.iam_organization_field or
            # FIXME:  It should be handled in another way. For example, if we try to get information for a specific job
            # and org isn't specified, we need to return the full list of labels, issues, comments.
            # Allow crowdsourcing users to get labels/issues/comments related to specific job.
            # Crowdsourcing user always has worker group and isn't a member of an organization.
            (
                view.__class__.__name__ in ('LabelViewSet', 'IssueViewSet', 'CommentViewSet') and
                request.query_params.get('job_id') and
                request.iam_context.get('organization') is None and
                request.iam_context.get('privilege') == 'worker'
            )
        ):
            return queryset

        visibility = None
        org = request.iam_context['organization']

        if org:
            visibility = {'organization': org.id}

        elif not org and self._parameter_is_provided(request):
            visibility = {'organization': None}

        if visibility:
            org_id = visibility.pop("organization")
            query = self._construct_filter_query(view.iam_organization_field, org_id)

            return queryset.filter(query).distinct()

        return queryset

    def get_schema_operation_parameters(self, view):
        if not view.iam_organization_field or view.detail:
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
