# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import mixins, viewsets
from django.utils.crypto import get_random_string
from cvat.apps.iam.permissions import (InvitationPermission,
                                       MembershipPermission,
                                       OrganizationPermission)
from cvat.apps.organizations.models import Invitation, Membership, Organization

from .serializers import (InvitationSerializer, MembershipSerializer,
                          OrganizationSerializer)



class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    ordering = ['-id']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        return super().get_permissions() + [OrganizationPermission()]

    def get_queryset(self):
         return OrganizationPermission().filter(self.request, super().get_queryset())

    def perform_create(self, serializer):
        extra_kwargs = { 'owner': self.request.user }
        if not serializer.validated_data.get('name'):
            extra_kwargs.update({ 'name': serializer.validated_data['slug'] })
        serializer.save(**extra_kwargs)

class MembershipViewSet(mixins.RetrieveModelMixin, mixins.DestroyModelMixin,
    mixins.ListModelMixin, viewsets.GenericViewSet):

    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    ordering = ['-id']

    def get_permissions(self):
        return super().get_permissions() + [MembershipPermission()]

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer
    ordering = ['-created_date']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        return super().get_permissions() + [InvitationPermission()]

    def get_queryset(self):
        queryset = super().get_queryset()
        organization = self.request.iam_context['organization']
        if organization:
            queryset = queryset.filter(membership__organization=organization)
        return InvitationPermission().filter(self.request, queryset)

    def perform_create(self, serializer):
        extra_kwargs = {
            'owner': self.request.user,
            'key': get_random_string(length=64),
        }
        serializer.save(**extra_kwargs)
