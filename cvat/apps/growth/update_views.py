# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from . import updates as updates_service
from .models import UserGrowthData
from .permissions import UpdatesPermission
from .serializers import (
    UpdatesAcknowledgementSerializer,
    UpdatesContentSerializer,
    UpdatesIndexSerializer,
    UpdatesStateSerializer,
)


@extend_schema(tags=["updates"])
class UpdatesViewSet(viewsets.GenericViewSet):
    iam_supports_organization_params = False
    iam_permission_class = UpdatesPermission
    serializer_class = UpdatesAcknowledgementSerializer
    pagination_class = None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not settings.CVAT_UPDATES_ENABLED:
            raise NotFound()

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response

    @extend_schema(
        summary="Get release notes, announcements and the current user's seen state",
        responses={200: UpdatesIndexSerializer},
    )
    def list(self, request):
        return Response(updates_service.index(UserGrowthData.for_user(request.user)))

    @extend_schema(
        summary="Get a published release note or announcement body",
        parameters=[
            OpenApiParameter("kind", str, enum=["release-notes", "announcements"], required=True),
            OpenApiParameter("id", str, required=True),
        ],
        responses={200: UpdatesContentSerializer},
    )
    @action(detail=False, methods=["GET"])
    def content(self, request):
        return Response(
            updates_service.content(
                request.query_params.get("kind"), request.query_params.get("id")
            )
        )

    @extend_schema(
        summary="Acknowledge displayed updates for the current user",
        request=UpdatesAcknowledgementSerializer,
        responses={200: UpdatesStateSerializer},
    )
    @action(detail=False, methods=["POST"])
    def acknowledge(self, request):
        serializer = UpdatesAcknowledgementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        version = values.get("release_version")
        seen_at = values.get("announcements_seen_at")
        if version is not None and not any(
            item["version"] == version for item in updates_service.entries("release-notes")
        ):
            # The overview acknowledges the displayed preview, not a full article.
            # Availability still excludes releases without matching sections.
            raise ValidationError(
                {
                    "release_version": "This release is not available for the current edition.",
                }
            )
        if seen_at is not None:
            batch, errors = updates_service.announcement_feed()
            if errors:
                raise updates_service.UpdatesUnavailable(
                    "The complete announcement feed is unavailable. Seen status was not advanced."
                )
            if not any(
                updates_service.publication_date(item["publishedAt"]) == seen_at for item in batch
            ):
                raise ValidationError(
                    {
                        "announcements_seen_at": "Use the publication timestamp of the loaded batch.",
                    }
                )

        current = UserGrowthData.for_user(request.user)
        # Older tabs cannot move either marker backwards.
        with transaction.atomic():
            current = UserGrowthData.objects.select_for_update().get(pk=current.pk)
            fields = []
            if version is not None and (
                current.last_seen_release_notes_version is None
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
