# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import functools

from django.http import Http404, HttpResponseBadRequest, HttpResponseRedirect
from rest_framework import views, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.http import etag as django_etag
from rest_framework.response import Response
from dj_rest_auth.app_settings import api_settings as dj_rest_auth_settings
from dj_rest_auth.registration.views import RegisterView
from dj_rest_auth.utils import jwt_encode
from dj_rest_auth.views import LoginView
from allauth.account import app_settings as allauth_settings
from allauth.account.views import ConfirmEmailView
from allauth.account.utils import complete_signup, has_verified_email, send_email_confirmation

from furl import furl

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer, extend_schema_view
from drf_spectacular.contrib.rest_auth import get_token_serializer_class

from .authentication import Signer
from .utils import get_opa_bundle

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

class LoginViewEx(LoginView):
    """
    Check the credentials and return the REST Token
    if the credentials are valid and authenticated.
    If email verification is enabled and the user has the unverified email,
    an email with a confirmation link will be sent.
    Calls Django Auth login method to register User ID
    in Django session framework.

    Accept the following POST parameters: username, email, password
    Return the REST Framework Token Object's key.
    """
    @extend_schema(responses=get_token_serializer_class())
    def post(self, request, *args, **kwargs):
        self.request = request
        self.serializer = self.get_serializer(data=self.request.data)
        try:
            self.serializer.is_valid(raise_exception=True)
        except ValidationError:
            user = self.serializer.get_auth_user(
                self.serializer.data.get('username'),
                self.serializer.data.get('email'),
                self.serializer.data.get('password')
            )
            if not user:
                raise

            # Check that user's email is verified.
            # If not, send a verification email.
            if not has_verified_email(user):
                send_email_confirmation(request, user)
                # we cannot use redirect to ACCOUNT_EMAIL_VERIFICATION_SENT_REDIRECT_URL here
                # because redirect will make a POST request and we'll get a 404 code
                # (although in the browser request method will be displayed like GET)
                return HttpResponseBadRequest('Unverified email')
        except Exception: # nosec
            pass

        self.login()
        return self.get_response()

class RegisterViewEx(RegisterView):
    def get_response_data(self, user):
        serializer = self.get_serializer(user)
        return serializer.data

    # NOTE: we should reimplement this method to fix the following issue:
    # In the previous used version of dj-rest-auth 2.2.7, if the REST_SESSION_LOGIN setting was not defined in the settings file,
    # the default value specified in the documentation (https://dj-rest-auth.readthedocs.io/en/2.2.7/configuration.html)
    # was not applied for some unknown reason, and an authentication token was added to a user.
    # With the dj-rest-auth version 5.0.2, there have been changes to how settings are handled,
    # and now the default value is properly taken into account.
    # However, even with the updated code, it still does not handle the scenario
    # of handling two authentication flows simultaneously during registration process.
    # Since there is no mention in the dj-rest-auth documentation that session authentication
    # cannot be used alongside token authentication (https://dj-rest-auth.readthedocs.io/en/latest/configuration.html),
    # and given the login implementation (https://github.com/iMerica/dj-rest-auth/blob/c6b6530eb0bfa5b10fd7b9e955a39301156e49d2/dj_rest_auth/views.py#L69-L75),
    # this situation appears to be a bug.
    # Link to the issue: https://github.com/iMerica/dj-rest-auth/issues/604
    def perform_create(self, serializer):
        user = serializer.save(self.request)
        if allauth_settings.EMAIL_VERIFICATION != \
                allauth_settings.EmailVerificationMethod.MANDATORY:
            if dj_rest_auth_settings.USE_JWT:
                self.access_token, self.refresh_token = jwt_encode(user)
            elif self.token_model:
                dj_rest_auth_settings.TOKEN_CREATOR(self.token_model, user, serializer)

        complete_signup(
            self.request._request, user,
            allauth_settings.EMAIL_VERIFICATION,
            None,
        )
        return user

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

    @_etag(lambda request: get_opa_bundle()[1])
    def get(self, request):
        return HttpResponse(get_opa_bundle()[0], content_type='application/x-tar')

class ConfirmEmailViewEx(ConfirmEmailView):
    template_name = 'account/email/email_confirmation_signup_message.html'

    def get(self, *args, **kwargs):
        try:
            if not allauth_settings.CONFIRM_EMAIL_ON_GET:
                return super().get(*args, **kwargs)
            return self.post(*args, **kwargs)
        except Http404:
            return HttpResponseRedirect(settings.INCORRECT_EMAIL_CONFIRMATION_URL)
