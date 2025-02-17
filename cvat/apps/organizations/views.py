# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils.crypto import get_random_string
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from cvat.apps.engine.mixins import PartialUpdateModelMixin
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.organizations.permissions import (
    InvitationPermission,
    MembershipPermission,
    OrganizationPermission,
)
from cvat.apps.organizations.throttle import ResendOrganizationInvitationThrottle

from .models import Invitation, Membership, Organization
from .serializers import (
    AcceptInvitationReadSerializer,
    InvitationReadSerializer,
    InvitationWriteSerializer,
    MembershipReadSerializer,
    MembershipWriteSerializer,
    OrganizationReadSerializer,
    OrganizationWriteSerializer,
)


@extend_schema(tags=["organizations"])
@extend_schema_view(
    retrieve=extend_schema(
        summary="Get organization details",
        responses={
            "200": OrganizationReadSerializer,
        },
    ),
    list=extend_schema(
        summary="List organizations",
        responses={
            "200": OrganizationReadSerializer(many=True),
        },
    ),
    partial_update=extend_schema(
        summary="Update an organization",
        request=OrganizationWriteSerializer(partial=True),
        responses={
            "200": OrganizationReadSerializer,  # check OrganizationWriteSerializer.to_representation
        },
    ),
    create=extend_schema(
        summary="Create an organization",
        request=OrganizationWriteSerializer,
        responses={
            "201": OrganizationReadSerializer,  # check OrganizationWriteSerializer.to_representation
        },
    ),
    destroy=extend_schema(
        summary="Delete an organization",
        responses={
            "204": OpenApiResponse(description="The organization has been deleted"),
        },
    ),
)
class OrganizationViewSet(
    viewsets.GenericViewSet,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    PartialUpdateModelMixin,
):
    queryset = Organization.objects.select_related("owner").all()
    search_fields = ("name", "owner", "slug")
    filter_fields = list(search_fields) + ["id"]
    simple_filters = list(search_fields)
    lookup_fields = {"owner": "owner__username"}
    ordering_fields = list(filter_fields)
    ordering = "-id"
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    iam_organization_field = None

    def get_queryset(self):
        queryset = super().get_queryset()

        permission = OrganizationPermission.create_scope_list(self.request)
        return permission.filter(queryset)

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return OrganizationReadSerializer
        else:
            return OrganizationWriteSerializer

    def perform_create(self, serializer):
        extra_kwargs = {"owner": self.request.user}
        if not serializer.validated_data.get("name"):
            extra_kwargs.update({"name": serializer.validated_data["slug"]})
        serializer.save(**extra_kwargs)

    class Meta:
        model = Membership
        fields = ("user",)


@extend_schema(tags=["memberships"])
@extend_schema_view(
    retrieve=extend_schema(
        summary="Get membership details",
        responses={
            "200": MembershipReadSerializer,
        },
    ),
    list=extend_schema(
        summary="List memberships",
        responses={
            "200": MembershipReadSerializer(many=True),
        },
    ),
    partial_update=extend_schema(
        summary="Update a membership",
        request=MembershipWriteSerializer(partial=True),
        responses={
            "200": MembershipReadSerializer,  # check MembershipWriteSerializer.to_representation
        },
    ),
    destroy=extend_schema(
        summary="Delete a membership",
        responses={
            "204": OpenApiResponse(description="The membership has been deleted"),
        },
    ),
)
class MembershipViewSet(
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    PartialUpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Membership.objects.select_related("invitation", "user").all()
    ordering = "-id"
    http_method_names = ["get", "patch", "delete", "head", "options"]
    search_fields = ("user", "role")
    filter_fields = list(search_fields) + ["id"]
    simple_filters = list(search_fields)
    ordering_fields = list(filter_fields)
    lookup_fields = {"user": "user__username"}
    iam_organization_field = "organization"

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return MembershipReadSerializer
        else:
            return MembershipWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == "list":
            permission = MembershipPermission.create_scope_list(self.request)
            queryset = permission.filter(queryset)

        return queryset


@extend_schema(tags=["invitations"])
@extend_schema_view(
    retrieve=extend_schema(
        summary="Get invitation details",
        responses={
            "200": InvitationReadSerializer,
        },
    ),
    list=extend_schema(
        summary="List invitations",
        responses={
            "200": InvitationReadSerializer(many=True),
        },
    ),
    partial_update=extend_schema(
        summary="Update an invitation",
        request=InvitationWriteSerializer(partial=True),
        responses={
            "200": InvitationReadSerializer,  # check InvitationWriteSerializer.to_representation
        },
    ),
    create=extend_schema(
        summary="Create an invitation",
        request=InvitationWriteSerializer,
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
        responses={
            "201": InvitationReadSerializer,  # check InvitationWriteSerializer.to_representation
        },
    ),
    destroy=extend_schema(
        summary="Delete an invitation",
        responses={
            "204": OpenApiResponse(description="The invitation has been deleted"),
        },
    ),
    accept=extend_schema(
        operation_id="invitations_accept",
        request=None,
        summary="Accept an invitation",
        responses={
            "200": OpenApiResponse(
                response=AcceptInvitationReadSerializer, description="The invitation is accepted"
            ),
            "400": OpenApiResponse(description="The invitation is expired or already accepted"),
        },
    ),
    decline=extend_schema(
        operation_id="invitations_decline",
        request=None,
        summary="Decline an invitation",
        responses={
            "204": OpenApiResponse(description="The invitation has been declined"),
        },
    ),
    resend=extend_schema(
        operation_id="invitations_resend",
        summary="Resend an invitation",
        request=None,
        responses={
            "204": OpenApiResponse(description="Invitation has been sent"),
            "400": OpenApiResponse(description="The invitation is already accepted"),
        },
    ),
)
class InvitationViewSet(
    viewsets.GenericViewSet,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    PartialUpdateModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
):
    queryset = Invitation.objects.all()
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    iam_organization_field = "membership__organization"

    search_fields = ("owner",)
    filter_fields = list(search_fields) + ["user_id", "accepted"]
    simple_filters = list(search_fields)
    ordering_fields = list(simple_filters) + ["created_date"]
    ordering = "-created_date"
    lookup_fields = {
        "owner": "owner__username",
        "user_id": "membership__user__id",
        "accepted": "membership__is_active",
    }

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return InvitationReadSerializer
        else:
            return InvitationWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        permission = InvitationPermission.create_scope_list(self.request)
        return permission.filter(queryset)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ImproperlyConfigured:
            return Response(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data="Email backend is not configured.",
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            key=get_random_string(length=64),
            organization=self.request.iam_context["organization"],
            request=self.request,
        )

    def perform_update(self, serializer):
        if "accepted" in self.request.query_params:
            serializer.instance.accept()
        else:
            super().perform_update(serializer)

    @transaction.atomic
    @action(detail=True, methods=["POST"], url_path="accept")
    def accept(self, request, pk):
        try:
            invitation = self.get_object()  # force to call check_object_permissions
            if invitation.expired:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data="Your invitation is expired. Please contact organization owner to renew it.",
                )
            if invitation.membership.is_active:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST, data="Your invitation is already accepted."
                )
            invitation.accept()
            response_serializer = AcceptInvitationReadSerializer(
                data={"organization_slug": invitation.membership.organization.slug}
            )
            response_serializer.is_valid(raise_exception=True)
            return Response(status=status.HTTP_200_OK, data=response_serializer.data)
        except Invitation.DoesNotExist:
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data="This invitation does not exist. Please contact organization owner.",
            )

    @action(
        detail=True,
        methods=["POST"],
        url_path="resend",
        throttle_classes=[ResendOrganizationInvitationThrottle],
    )
    def resend(self, request, pk):
        try:
            invitation = self.get_object()  # force to call check_object_permissions
            if invitation.membership.is_active:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST, data="This invitation is already accepted."
                )
            invitation.send(request)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Invitation.DoesNotExist:
            return Response(
                status=status.HTTP_404_NOT_FOUND, data="This invitation does not exist."
            )
        except ImproperlyConfigured:
            return Response(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data="Email backend is not configured.",
            )

    @action(detail=True, methods=["POST"], url_path="decline")
    def decline(self, request, pk):
        try:
            invitation = self.get_object()  # force to call check_object_permissions
            membership = invitation.membership
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Invitation.DoesNotExist:
            return Response(
                status=status.HTTP_404_NOT_FOUND, data="This invitation does not exist."
            )
