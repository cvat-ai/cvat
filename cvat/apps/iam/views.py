# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import functools
import hashlib
import os.path as osp

from django.core.exceptions import BadRequest
from django.utils.functional import SimpleLazyObject
from rest_framework import views, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.http import etag as django_etag
from rest_framework.response import Response
from dj_rest_auth.registration.views import RegisterView
from allauth.account import app_settings as allauth_settings
from furl import furl

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer, extend_schema_view

from .authentication import Signer

def get_context(request):
    from cvat.apps.organizations.models import Organization, Membership

    IAM_ROLES = {role:priority for priority, role in enumerate(settings.IAM_ROLES)}
    groups = list(request.user.groups.filter(name__in=list(IAM_ROLES.keys())))
    groups.sort(key=lambda group: IAM_ROLES[group.name])

    organization = None
    membership = None
    try:
        org_slug = request.GET.get('org')
        org_id = request.GET.get('org_id')
        org_header = request.headers.get('X-Organization')

        if org_id is not None and (org_slug is not None or org_header is not None):
            raise BadRequest('You cannot specify "org_id" query parameter with '
                '"org" query parameter or "X-Organization" HTTP header at the same time.')
        if org_slug is not None and org_header is not None and org_slug != org_header:
            raise BadRequest('You cannot specify "org" query parameter and '
                '"X-Organization" HTTP header with different values.')
        org_slug = org_slug if org_slug is not None else org_header

        org_filter = None
        if org_slug:
            organization = Organization.objects.get(slug=org_slug)
            membership = Membership.objects.filter(organization=organization,
                user=request.user).first()
            org_filter = { 'organization': organization.id }
        elif org_id:
            organization = Organization.objects.get(id=int(org_id))
            membership = Membership.objects.filter(organization=organization,
                user=request.user).first()
            org_filter = { 'organization': organization.id }
        elif org_slug is not None:
            org_filter = { 'organization': None }
    except Organization.DoesNotExist:
        raise BadRequest(f'{org_slug or org_id} organization does not exist.')

    if membership and not membership.is_active:
        membership = None

    context = {
        "privilege": groups[0] if groups else None,
        "membership": membership,
        "organization": organization,
        "visibility": org_filter,
    }

    return context

class ContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        # https://stackoverflow.com/questions/26240832/django-and-middleware-which-uses-request-user-is-always-anonymous
        request.iam_context = SimpleLazyObject(lambda: get_context(request))

        return self.get_response(request)

@extend_schema(tags=['auth'])
@extend_schema_view(post=extend_schema(
    summary='This method signs URL for access to the server',
    description='Signed URL contains a token which authenticates a user on the server.'
                'Signed URL is valid during 30 seconds since signing.',
    request=inline_serializer(
        name='Signing',
        fields={
            'url': serializers.CharField(),
        }
    ),
    responses={'200': OpenApiResponse(response=OpenApiTypes.STR, description='text URL')}))
class SigningView(views.APIView):

    def post(self, request):
        url = request.data.get('url')
        if not url:
            raise ValidationError('Please provide `url` parameter')

        signer = Signer()
        url = self.request.build_absolute_uri(url)
        sign = signer.sign(self.request.user, url)

        url = furl(url).add({Signer.QUERY_PARAM: sign}).url
        return Response(url)

class RegisterViewEx(RegisterView):
    def get_response_data(self, user):
        data = self.get_serializer(user).data
        data['email_verification_required'] = True
        data['key'] = None
        if allauth_settings.EMAIL_VERIFICATION != \
            allauth_settings.EmailVerificationMethod.MANDATORY:
            data['email_verification_required'] = False
            data['key'] = user.auth_token.key
        return data

def _etag(etag_func):
    """
    Decorator to support conditional retrieval (or change)
    for a Django Rest Framework's ViewSet.
    It calls Django's original decorator but pass correct request object to it.
    Django's original decorator doesn't work with DRF request object.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(obj_self, request, *args, **kwargs):
            drf_request = request
            wsgi_request = request._request

            @django_etag(etag_func=etag_func)
            def patched_viewset_method(*_args, **_kwargs):
                """Call original viewset method with correct type of request"""
                return func(obj_self, drf_request, *args, **kwargs)

            return patched_viewset_method(wsgi_request, *args, **kwargs)
        return wrapper
    return decorator

class RulesView(views.APIView):
    serializer_class = None
    permission_classes = [AllowAny]
    authentication_classes = []
    iam_organization_field = None

    @staticmethod
    def _get_bundle_path():
        return settings.IAM_RULE_BUNDLE_PATH

    @staticmethod
    def _etag_func(file_path):
        with open(file_path, 'rb') as f:
            return hashlib.blake2b(f.read()).hexdigest()

    @_etag(lambda _: RulesView._etag_func(RulesView._get_bundle_path()))
    def get(self, request):
        file_obj = open(self._get_bundle_path() ,"rb")
        return HttpResponse(file_obj, content_type='application/x-tar')
