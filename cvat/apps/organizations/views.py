# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import mixins, viewsets
from rest_framework.permissions import SAFE_METHODS
from django.utils.crypto import get_random_string

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from cvat.apps.engine.mixins import PartialUpdateModelMixin

from cvat.apps.iam.permissions import (
    InvitationPermission, MembershipPermission, OrganizationPermission)
from .models import Invitation, Membership, Organization

from .serializers import (
    InvitationReadSerializer, InvitationWriteSerializer,
    MembershipReadSerializer, MembershipWriteSerializer,
    OrganizationReadSerializer, OrganizationWriteSerializer)

@extend_schema(tags=['organizations'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of an organization',
        responses={
            '200': OrganizationReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of organizations',
        responses={
            '200': OrganizationReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in an organization',
        request=OrganizationWriteSerializer(partial=True),
        responses={
            '200': OrganizationReadSerializer, # check OrganizationWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Method creates an organization',
        request=OrganizationWriteSerializer,
        responses={
            '201': OrganizationReadSerializer, # check OrganizationWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Method deletes an organization',
        responses={
            '204': OpenApiResponse(description='The organization has been deleted'),
        })
)
class OrganizationViewSet(viewsets.GenericViewSet,
                   mixins.RetrieveModelMixin,
                   mixins.ListModelMixin,
                   mixins.CreateModelMixin,
                   mixins.DestroyModelMixin,
                   PartialUpdateModelMixin,
    ):
    queryset = Organization.objects.all()
    search_fields = ('name', 'owner')
    filter_fields = list(search_fields) + ['id', 'slug']
    simple_filters = list(search_fields) + ['slug']
    lookup_fields = {'owner': 'owner__username'}
    ordering_fields = list(filter_fields)
    ordering = '-id'
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
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
        extra_kwargs = { 'owner': self.request.user }
        if not serializer.validated_data.get('name'):
            extra_kwargs.update({ 'name': serializer.validated_data['slug'] })
        serializer.save(**extra_kwargs)

    class Meta:
        model = Membership
        fields = ("user", )

@extend_schema(tags=['memberships'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of a membership',
        responses={
            '200': MembershipReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of memberships',
        responses={
            '200': MembershipReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in a membership',
        request=MembershipWriteSerializer(partial=True),
        responses={
            '200': MembershipReadSerializer, # check MembershipWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Method deletes a membership',
        responses={
            '204': OpenApiResponse(description='The membership has been deleted'),
        })
)
class MembershipViewSet(mixins.RetrieveModelMixin, mixins.DestroyModelMixin,
    mixins.ListModelMixin, PartialUpdateModelMixin, viewsets.GenericViewSet):
    queryset = Membership.objects.all()
    ordering = '-id'
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    search_fields = ('user', 'role')
    filter_fields = list(search_fields) + ['id']
    simple_filters = list(search_fields)
    ordering_fields = list(filter_fields)
    lookup_fields = {'user': 'user__username'}
    iam_organization_field = 'organization'

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return MembershipReadSerializer
        else:
            return MembershipWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        permission = MembershipPermission.create_scope_list(self.request)
        return permission.filter(queryset)

@extend_schema(tags=['invitations'])
@extend_schema_view(
    retrieve=extend_schema(
        summary='Method returns details of an invitation',
        responses={
            '200': InvitationReadSerializer,
        }),
    list=extend_schema(
        summary='Method returns a paginated list of invitations',
        responses={
            '200': InvitationReadSerializer(many=True),
        }),
    partial_update=extend_schema(
        summary='Methods does a partial update of chosen fields in an invitation',
        request=InvitationWriteSerializer(partial=True),
        responses={
            '200': InvitationReadSerializer, # check InvitationWriteSerializer.to_representation
        }),
    create=extend_schema(
        summary='Method creates an invitation',
        request=InvitationWriteSerializer,
        responses={
            '201': InvitationReadSerializer, # check InvitationWriteSerializer.to_representation
        }),
    destroy=extend_schema(
        summary='Method deletes an invitation',
        responses={
            '204': OpenApiResponse(description='The invitation has been deleted'),
        })
)
class InvitationViewSet(viewsets.GenericViewSet,
                   mixins.RetrieveModelMixin,
                   mixins.ListModelMixin,
                   PartialUpdateModelMixin,
                   mixins.CreateModelMixin,
                   mixins.DestroyModelMixin,
    ):
    queryset = Invitation.objects.all()
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    iam_organization_field = 'membership__organization'

    search_fields = ('owner',)
    filter_fields = list(search_fields)
    simple_filters = list(search_fields)
    ordering_fields = list(filter_fields) + ['created_date']
    ordering = '-created_date'
    lookup_fields = {'owner': 'owner__username'}

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return InvitationReadSerializer
        else:
            return InvitationWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        permission = InvitationPermission.create_scope_list(self.request)
        return permission.filter(queryset)

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            key=get_random_string(length=64),
            organization=self.request.iam_context['organization']
        )

    def perform_update(self, serializer):
        if 'accepted' in self.request.query_params:
            serializer.instance.accept()
        else:
            super().perform_update(serializer)
