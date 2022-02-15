# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import mixins, viewsets
from rest_framework.permissions import SAFE_METHODS
from django.utils.crypto import get_random_string
from django_filters import rest_framework as filters

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from cvat.apps.iam.permissions import (
    InvitationPermission, MembershipPermission, OrganizationPermission)
from .models import Invitation, Membership, Organization

from .serializers import (
    InvitationReadSerializer, InvitationWriteSerializer,
    MembershipReadSerializer, MembershipWriteSerializer,
    OrganizationReadSerializer, OrganizationWriteSerializer)


@extend_schema_view(retrieve=extend_schema(
    summary='Method returns details of an organization',
    responses={
        '200': OrganizationReadSerializer,
    }, tags=['organizations'], versions=['2.0']))
@extend_schema_view(list=extend_schema(
    summary='Method returns a paginated list of organizatins according to query parameters',
    responses={
        '200': OrganizationReadSerializer(many=True),
    }, tags=['organizations'], versions=['2.0']))
@extend_schema_view(update=extend_schema(
    summary='Method updates an organization by id',
    responses={
        '200': OrganizationWriteSerializer,
    }, tags=['organizations'], versions=['2.0']))
@extend_schema_view(partial_update=extend_schema(
   summary='Methods does a partial update of chosen fields in an organization',
   responses={
       '200': OrganizationWriteSerializer,
   }, tags=['organizations'], versions=['2.0']))
@extend_schema_view(create=extend_schema(
    summary='Method creates an organization',
    responses={
        '201': OrganizationWriteSerializer,
    }, tags=['organizations'], versions=['2.0']))
@extend_schema_view(destroy=extend_schema(
    summary='Method deletes an organization',
    responses={
        '204': OpenApiResponse(description='The organization has been deleted'),
    }, tags=['organizations'], versions=['2.0']))
class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    ordering = ['-id']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    pagination_class = None
    iam_organization_field = None

    def get_queryset(self):
        queryset = super().get_queryset()
        permission = OrganizationPermission(self.request, self)
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

class MembershipFilter(filters.FilterSet):
    user = filters.CharFilter(field_name="user__id")

    class Meta:
        model = Membership
        fields = ("user", )
@extend_schema_view(retrieve=extend_schema(
    summary='Method returns details of a membership',
    responses={
        '200': MembershipReadSerializer,
    }, tags=['memberships'], versions=['2.0']))
@extend_schema_view(list=extend_schema(
    summary='Method returns a paginated list of memberships according to query parameters',
    responses={
        '200': MembershipReadSerializer(many=True),
    }, tags=['memberships'], versions=['2.0']))
@extend_schema_view(update=extend_schema(
    summary='Method updates a membership by id',
    responses={
        '200': MembershipWriteSerializer,
    }, tags=['memberships'], versions=['2.0']))
@extend_schema_view(partial_update=extend_schema(
   summary='Methods does a partial update of chosen fields in a membership',
   responses={
       '200': MembershipWriteSerializer,
   }, tags=['memberships'], versions=['2.0']))
@extend_schema_view(destroy=extend_schema(
    summary='Method deletes a membership',
    responses={
        '204': OpenApiResponse(description='The membership has been deleted'),
    }, tags=['memberships'], versions=['2.0']))
class MembershipViewSet(mixins.RetrieveModelMixin, mixins.DestroyModelMixin,
    mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = Membership.objects.all()
    ordering = ['-id']
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    filterset_class = MembershipFilter
    iam_organization_field = 'organization'

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return MembershipReadSerializer
        else:
            return MembershipWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        permission = MembershipPermission(self.request, self)
        return permission.filter(queryset)

# TODO
@extend_schema_view(retrieve=extend_schema(
    summary='Method returns details of an invitation',
    responses={
        '200': InvitationReadSerializer,
    }, tags=['invitations'], versions=['2.0']))
@extend_schema_view(list=extend_schema(
    summary='Method returns a paginated list of invitations according to query parameters',
    responses={
        '200': InvitationReadSerializer(many=True),
    }, tags=['invitations'], versions=['2.0']))
@extend_schema_view(update=extend_schema(
    summary='Method updates an invitation by id',
    responses={
        '200': InvitationWriteSerializer,
    }, tags=['invitations'], versions=['2.0']))
@extend_schema_view(partial_update=extend_schema(
   summary='Methods does a partial update of chosen fields in an invitation',
   responses={
       '200': InvitationWriteSerializer,
   }, tags=['invitations'], versions=['2.0']))
@extend_schema_view(create=extend_schema(
    summary='Method creates an invitation',
    responses={
        '201': InvitationWriteSerializer,
    }, tags=['invitations'], versions=['2.0']))
@extend_schema_view(destroy=extend_schema(
    summary='Method deletes an invitation',
    responses={
        '204': OpenApiResponse(description='The invitation has been deleted'),
    }, tags=['invitations'], versions=['2.0']))
class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    ordering = ['-created_date']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    iam_organization_field = 'membership__organization'

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return InvitationReadSerializer
        else:
            return InvitationWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        permission = InvitationPermission(self.request, self)
        return permission.filter(queryset)

    def perform_create(self, serializer):
        extra_kwargs = {
            'owner': self.request.user,
            'key': get_random_string(length=64),
            'organization': self.request.iam_context['organization']
        }
        serializer.save(**extra_kwargs)

    def perform_update(self, serializer):
        if 'accepted' in self.request.query_params:
            serializer.instance.accept()
        else:
            super().perform_update(serializer)