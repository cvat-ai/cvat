# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from cvat.apps.access_tokens.authentication import AccessTokenAuthentication
from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.engine.types import ExtendedRequest

from . import models
from .permissions import AccessTokenPermission
from .serializers import AccessTokenReadSerializer, AccessTokenWriteSerializer


@extend_schema(tags=["auth"])
@extend_schema_view(
    list=extend_schema(
        summary="List tokens",
        responses={"200": AccessTokenReadSerializer(many=True)},
    ),
    create=extend_schema(
        summary="Create a token",
        request=AccessTokenWriteSerializer,
        responses={"201": AccessTokenReadSerializer},
    ),
    retrieve=extend_schema(
        summary="Get token details",
        responses={"200": AccessTokenReadSerializer},
    ),
    partial_update=extend_schema(
        summary="Update a token",
        request=AccessTokenWriteSerializer,
        responses={"200": AccessTokenReadSerializer(partial=True)},
    ),
    destroy=extend_schema(
        summary="Revoke token",
        responses={"204": OpenApiResponse(description="The token was successfully revoked")},
    ),
)
class AccessTokensViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    PartialUpdateModelMixin,
):
    queryset = models.AccessToken.objects.none()  # for API schema only

    search_fields = ("name",)
    filter_fields = list(search_fields) + [
        "id",
        "created_date",
        "updated_date",
        "expiry_date",
        "last_used_date",
        "read_only",
    ]
    simple_filters = list(search_fields)
    ordering_fields = list(filter_fields)
    ordering = "-id"

    iam_organization_field = None
    iam_permission_class = AccessTokenPermission

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return AccessTokenReadSerializer
        else:
            return AccessTokenWriteSerializer

    def get_queryset(self):
        # Get a new queryset here to avoid potentially outdated constants
        # (e.g. staleness check date) stored in the filter expression
        queryset = models.AccessToken.objects.get_usable_keys()

        if self.action == "list":
            perm = AccessTokenPermission.create_scope_list(self.request)
            queryset = perm.filter(queryset)

        return queryset

    def perform_destroy(self, instance: models.AccessToken):
        instance.revoked = True
        instance.save(update_fields=["revoked", "updated_date"])

    @extend_schema(
        summary="Get current token details",
        description=textwrap.dedent(
            """\
            Get details of the token used for the current request.
            This endpoint is only allowed if the request is performed using an access token.
            """
        ),
        responses={"200": AccessTokenReadSerializer},
    )
    @action(detail=False, methods=["GET"], authentication_classes=[AccessTokenAuthentication])
    def self(self, request: ExtendedRequest):
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.auth, context={"request": request})
        return Response(serializer.data)
