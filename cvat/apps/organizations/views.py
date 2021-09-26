# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.utils.functional import SimpleLazyObject
from django.contrib.auth.models import Group
from rest_framework import mixins, viewsets
from cvat.apps.iam.permissions import (InvitationPermission,
                                       MembershipPermission,
                                       OrganizationPermission)
from cvat.apps.organizations.models import Invitation, Membership, Organization

from .serializers import (InvitationSerializer, MembershipSerializer,
                          OrganizationSerializer)


def get_auth_context(request):
    groups = list(request.user.groups.filter(
        name__in=['admin', 'business', 'user', 'worker']))
    # The code below will sort groups in the right order
    groups.sort(key=lambda group: group.name)
    # FIXME: understand why createsuperuser doesn't add 'admin' group
    if request.user.is_superuser:
        admin, _ = Group.objects.get_or_create(name='admin')
        groups.insert(0, admin)


    org_id = request.GET.get('org', None)
    organization = None
    membership = None
    if org_id:
        organization = Organization.objects.get(slug=org_id)
        membership = Membership.objects.filter(organization=organization,
            user=request.user).first()


    context = {
        "privilege": groups[0] if groups else None,
        "membership": membership,
        "organization": organization,
    }

    return context
class AuthContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        # https://stackoverflow.com/questions/26240832/django-and-middleware-which-uses-request-user-is-always-anonymous
        request.auth_context = SimpleLazyObject(lambda: get_auth_context(request))

        return self.get_response(request)

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer

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

    def get_permissions(self):
        return super().get_permissions() + [MembershipPermission()]

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer

    def get_permissions(self):
        return super().get_permissions() + [InvitationPermission()]
