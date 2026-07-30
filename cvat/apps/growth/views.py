# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets

from cvat.apps.engine.mixins import PartialUpdateModelMixin

from .models import UserGrowthData
from .permissions import UserGrowthDataPermission
from .serializers import UserGrowthDataSerializer


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

    def get_queryset(self):
        UserGrowthData.objects.get_or_create(
            user=self.request.user,
            defaults={"github_prompt_shown_at": self.request.user.date_joined},
        )
        queryset = UserGrowthData.objects.select_related("user")

        if self.action == "list":
            permission = UserGrowthDataPermission.create_scope_list(self.request)
            queryset = permission.filter(queryset)

        return queryset
