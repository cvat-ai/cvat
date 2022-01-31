# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import mixins, viewsets
from rest_framework.permissions import SAFE_METHODS
from django.utils.crypto import get_random_string
from django_filters import rest_framework as filters

from cvat.apps.iam.permissions import (
    InvitationPermission, MembershipPermission, OrganizationPermission)
from .models import Invitation, Membership, Organization

from .serializers import (
    InvitationReadSerializer, InvitationWriteSerializer,
    MembershipReadSerializer, MembershipWriteSerializer,
    OrganizationReadSerializer, OrganizationWriteSerializer)

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