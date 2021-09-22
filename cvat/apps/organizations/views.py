# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth.models import Group
from django.db.models import query
from django.utils.functional import SimpleLazyObject
from rest_framework import mixins, viewsets
from rest_framework.decorators import action

from cvat.apps.engine import serializers
from cvat.apps.iam.permissions import (OrganizationPermission,
    MembershipPermission, InvitationPermission)

from . import models
from .serializers import (InvitationSerializer, MembershipSerializer,
    OrganizationSerializer)


def get_user_group(request):
    user = request.user
    groups = list(user.groups.filter(name__in=['admin', 'business', 'user', 'worker']))
    # The code below will sort groups and the right order
    groups.sort(key=lambda group: group.name)

    return groups[0] if groups else None

def get_organization(request):
    org_name = request.GET.get('organization', None)
    return None

def get_org_member(request):
    role = None
    if request.organization:
        pass

    return role
class ContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        # https://stackoverflow.com/questions/26240832/django-and-middleware-which-uses-request-user-is-always-anonymous
        request.user_group = SimpleLazyObject(lambda: get_user_group(request))
        request.organization = get_organization(request)
        request.org_member = SimpleLazyObject(lambda: get_org_member(request))

        return self.get_response(request)

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = models.Organization.objects.all()
    serializer_class = OrganizationSerializer

    def get_permissions(self):
        return super().get_permissions() + [OrganizationPermission()]

    def perform_create(self, serializer):
        extra_kwargs = { 'owner': self.request.user }
        if not serializer.validated_data.get('name'):
            extra_kwargs.update({ 'name': serializer.validated_data['slug'] })
        serializer.save(**extra_kwargs)

class MembershipViewSet(mixins.RetrieveModelMixin, mixins.DestroyModelMixin,
    mixins.ListModelMixin, viewsets.GenericViewSet):

    queryset = models.Membership.objects.all()
    serializer_class = MembershipSerializer

    def get_permissions(self):
        return super().get_permissions() + [MembershipPermission()]

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = models.Invitation.objects.all()
    serializer_class = InvitationSerializer

    def get_permissions(self):
        return super().get_permissions() + [InvitationPermission()]
