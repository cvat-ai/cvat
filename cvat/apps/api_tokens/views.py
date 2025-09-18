# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from cvat.apps.api_tokens.authentication import ApiTokenAuthentication
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.types import ExtendedRequest

from . import models
from .permissions import ApiTokenPermission
from .serializers import ApiTokenReadSerializer, ApiTokenWriteSerializer


@extend_schema(tags=["auth"])
@extend_schema_view(
    list=extend_schema(
        summary="List API tokens",
        responses={"200": ApiTokenReadSerializer(many=True)},
    ),
    create=extend_schema(
        summary="Create an API token",
        request=ApiTokenWriteSerializer,
        responses={"201": ApiTokenReadSerializer},
    ),
    retrieve=extend_schema(
        summary="Get API token details",
        responses={"200": ApiTokenReadSerializer},
    ),
    partial_update=extend_schema(
        summary="Update an API token",
        request=ApiTokenWriteSerializer,
        responses={"200": ApiTokenReadSerializer(partial=True)},
    ),
    destroy=extend_schema(
        summary="Revoke API token",
        responses={"204": OpenApiResponse(description="The token was successfully revoked")},
    ),
)
class ApiTokensViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    PartialUpdateModelMixin,
):
    queryset = models.ApiToken.objects.none()  # for API schema only

    search_fields = ("name",)
    filter_fields = list(search_fields) + [
        "id",
        "owner",
        "created_date",
        "updated_date",
        "expiry_date",
        "last_used_date",
        "read_only",
    ]
    simple_filters = list(search_fields) + ["owner"]
    ordering_fields = list(filter_fields)
    ordering = "-id"
    lookup_fields = {
        "owner": "owner__id",
    }

    iam_organization_field = None

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return ApiTokenReadSerializer
        else:
            return ApiTokenWriteSerializer

    def get_queryset(self):
        # Get a new queryset here to avoid potentially outdated constants
        # (e.g. staleness check date) stored in the filter expression
        queryset = models.ApiToken.objects.get_usable_keys()

        if self.action == "list":
            perm = ApiTokenPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def perform_destroy(self, instance: models.ApiToken):
        instance.revoked = True
        instance.save(update_fields=["revoked", "updated_date"])

    @extend_schema(
        summary="Get current API token details",
        description=textwrap.dedent(
            """\
            Get details of the API token used for the current request.
            This endpoint is only allowed if the request is performed using an API token.
            """
        ),
        responses={"200": ApiTokenReadSerializer},
    )
    @action(detail=False, methods=["GET"], authentication_classes=[ApiTokenAuthentication])
    def self(self, request: ExtendedRequest):
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.auth, context={"request": request})
        return Response(serializer.data)
