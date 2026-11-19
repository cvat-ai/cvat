# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from cvat.apps.engine.mixins import PartialUpdateModelMixin

from . import updates as updates_service
from .models import UserGrowthData
from .permissions import UpdatesPermission, UserGrowthDataPermission
from .serializers import (
    UpdatesAcknowledgementSerializer,
    UpdatesIndexSerializer,
    UpdatesStateSerializer,
    UserGrowthDataSerializer,
)


@extend_schema(tags=["growth"])
@extend_schema_view(
    list=extend_schema(summary="List growth data"),
    retrieve=extend_schema(summary="Get growth data"),
    partial_update=extend_schema(
        summary="Update growth data",
        request=UserGrowthDataSerializer(partial=True),
    ),
)
class UserGrowthDataViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    PartialUpdateModelMixin,
):
    serializer_class = UserGrowthDataSerializer
    iam_supports_organization_params = False
    iam_permission_class = UserGrowthDataPermission
    search_fields = ()
    simple_filters = ("user_id",)
    filter_fields = (*simple_filters, "id")
    ordering_fields = ("id",)
    ordering = "id"

    def get_queryset(self) -> QuerySet[UserGrowthData]:
        if getattr(self, "swagger_fake_view", False):
            return UserGrowthData.objects.none()

        UserGrowthData.for_user(self.request.user)
        queryset = UserGrowthData.objects.select_related("user")

        if self.action == "list":
            permission = UserGrowthDataPermission.create_scope_list(self.request)
            queryset = permission.filter(queryset)

        return queryset


@extend_schema(tags=["whats-new"])
class UpdatesViewSet(viewsets.ViewSet):
    iam_supports_organization_params = False
    iam_permission_class = UpdatesPermission

    def initial(self, request: Request, *args: Any, **kwargs: Any) -> None:
        super().initial(request, *args, **kwargs)
        if not settings.CVAT_NEWS_ENABLED:
            raise NotFound()

    def finalize_response(
        self, request: Request, response: Response, *args: Any, **kwargs: Any
    ) -> Response:
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response

    @extend_schema(
        summary="Get the What's New popup summary and the current user's seen state",
        responses={200: UpdatesIndexSerializer},
    )
    def list(self, request: Request) -> Response:
        serializer = UpdatesIndexSerializer(
            updates_service.index(UserGrowthData.for_user(request.user))
        )
        return Response(serializer.data)

    @extend_schema(
        summary="Acknowledge displayed updates for the current user",
        request=UpdatesAcknowledgementSerializer,
        responses={200: UpdatesStateSerializer},
    )
    @action(detail=False, methods=["POST"])
    def acknowledge(self, request: Request) -> Response:
        serializer = UpdatesAcknowledgementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        version = values.get("release_version")
        seen_at = values.get("announcements_seen_at")
        if version is not None and not updates_service.has_entry(version=version):
            raise ValidationError(
                {
                    "release_version": "This release is not available for the current edition.",
                }
            )
        current = UserGrowthData.for_user(request.user)
        # Older tabs cannot move either marker backwards.
        with transaction.atomic():
            current = UserGrowthData.objects.select_for_update().get(pk=current.pk)
            fields = []
            if version is not None and (
                not current.last_seen_release_notes_version
                or updates_service.version_parts(version)
                > updates_service.version_parts(current.last_seen_release_notes_version)
            ):
                current.last_seen_release_notes_version = version
                fields.append("last_seen_release_notes_version")
            if seen_at is not None and (
                current.last_seen_announcements_date is None
                or seen_at > current.last_seen_announcements_date
            ):
                current.last_seen_announcements_date = seen_at
                fields.append("last_seen_announcements_date")
            if fields:
                current.save(update_fields=fields)
        return Response(updates_service.state(current))
