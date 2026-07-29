# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from cvat.apps.engine.mixins import PartialUpdateModelMixin

from .models import UserGrowthData
from .serializers import UserGrowthDataSerializer


@extend_schema(tags=["growth"])
@extend_schema_view(
    list=extend_schema(summary="List growth data for the current user"),
    retrieve=extend_schema(summary="Get growth data for the current user"),
    partial_update=extend_schema(
        summary="Update growth data for the current user",
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
    permission_classes = (IsAuthenticated,)
    iam_supports_organization_params = False
    search_fields = ()
    simple_filters = ()
    filter_fields = ()
    ordering_fields = ("id",)
    ordering = "id"

    def get_queryset(self):
        UserGrowthData.objects.get_or_create(
            user=self.request.user,
            defaults={"github_prompt_shown_at": self.request.user.date_joined},
        )
        return UserGrowthData.objects.filter(user=self.request.user).select_related("user")
