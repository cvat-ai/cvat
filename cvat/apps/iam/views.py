# Copyright (C) 2021-2023 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import functools
import hashlib

from django.utils.functional import SimpleLazyObject
from django.http import Http404, HttpResponseBadRequest, HttpResponseRedirect
from rest_framework import views, serializers
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.http import etag as django_etag
from rest_framework.response import Response
from dj_rest_auth.registration.views import RegisterView, SocialLoginView
from dj_rest_auth.views import LoginView
from dj_rest_auth.utils import import_callable
from allauth.account import app_settings as allauth_settings
from allauth.account.views import ConfirmEmailView
from allauth.account.utils import has_verified_email, send_email_confirmation
from allauth.socialaccount.models import SocialLogin
from allauth.socialaccount.providers.oauth2.views import OAuth2CallbackView, OAuth2LoginView
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from allauth.utils import get_request_param

from furl import furl

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, OpenApiParameter, extend_schema, inline_serializer, extend_schema_view
from drf_spectacular.contrib.rest_auth import get_token_serializer_class

from .authentication import Signer
from  cvat.apps.iam.serializers import SocialLoginSerializerEx, SocialAuthMethodSerializer

GitHubAdapter = (
    import_callable(settings.SOCIALACCOUNT_GITHUB_ADAPTER)
    if settings.USE_ALLAUTH_SOCIAL_ACCOUNTS
    else None
)
GoogleAdapter = (
    import_callable(settings.SOCIALACCOUNT_GOOGLE_ADAPTER)
    if settings.USE_ALLAUTH_SOCIAL_ACCOUNTS
    else None
)

AmazonCognitoAdapter = (
    import_callable(settings.SOCIALACCOUNT_AMAZON_COGNITO_ADAPTER)
    if settings.USE_ALLAUTH_SOCIAL_ACCOUNTS
    else None
)

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
            raise ValidationError('You cannot specify "org_id" query parameter with '
                '"org" query parameter or "X-Organization" HTTP header at the same time.')
        if org_slug is not None and org_header is not None and org_slug != org_header:
            raise ValidationError('You cannot specify "org" query parameter and '
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
        raise NotFound(f'{org_slug or org_id} organization does not exist.')

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
        return settings.IAM_OPA_BUNDLE_PATH

    @staticmethod
    def _etag_func(file_path):
        with open(file_path, 'rb') as f:
            return hashlib.blake2b(f.read()).hexdigest()

    @_etag(lambda _: RulesView._etag_func(RulesView._get_bundle_path()))
    def get(self, request):
        file_obj = open(self._get_bundle_path() ,"rb")
        return HttpResponse(file_obj, content_type='application/x-tar')

class OAuth2CallbackViewEx(OAuth2CallbackView):
    def dispatch(self, request, *args, **kwargs):
        # Distinguish cancel from error
        if (auth_error := request.GET.get('error', None)):
            if auth_error == self.adapter.login_cancelled_error:
                return HttpResponseRedirect(settings.SOCIALACCOUNT_CALLBACK_CANCELLED_URL)
            else: # unknown error
                raise ValidationError(auth_error)

        code = request.GET.get('code')

        # verify request state
        if self.adapter.supports_state:
            state = SocialLogin.verify_and_unstash_state(
                request, get_request_param(request, 'state')
            )
        else:
            state = SocialLogin.unstash_state(request)

        if not code:
            return HttpResponseBadRequest('Parameter code not found in request')

        provider = self.adapter.provider_id.replace('_', '-')

        return HttpResponseRedirect(
            f'{settings.SOCIAL_APP_LOGIN_REDIRECT_URL}/?provider={provider}&code={code}'
            f'&auth_params={state.get("auth_params")}&process={state.get("process")}'
            f'&scope={state.get("scope")}')


@extend_schema(
    summary="Redirets to Github authentication page",
    description="Redirects to the Github authentication page. "
                "After successful authentication on the provider side, "
                "a redirect to the callback endpoint is performed",
)
@api_view(["GET"])
@permission_classes([AllowAny])
def github_oauth2_login(*args, **kwargs):
    return OAuth2LoginView.adapter_view(GitHubAdapter)(*args, **kwargs)

@extend_schema(
    summary="Checks the authentication response from Github, redirects to the CVAT client if successful.",
    description="Accepts a request from Github with code and state query parameters. "
                "In case of successful authentication on the provider side, it will "
                "redirect to the CVAT client",
    parameters=[
        OpenApiParameter('code', description='Returned by github',
            location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
        OpenApiParameter('state', description='Returned by github',
            location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    ],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def github_oauth2_callback(*args, **kwargs):
    return OAuth2CallbackViewEx.adapter_view(GitHubAdapter)(*args, **kwargs)


@extend_schema(
    summary="Redirects to Google authentication page",
    description="Redirects to the Google authentication page. "
                "After successful authentication on the provider side, "
                "a redirect to the callback endpoint is performed.",
)
@api_view(["GET"])
@permission_classes([AllowAny])
def google_oauth2_login(*args, **kwargs):
    return OAuth2LoginView.adapter_view(GoogleAdapter)(*args, **kwargs)

@extend_schema(
    summary="Redirects to Amazon Cognito authentication page",
    description="Redirects to the Amazon Cognito authentication page. "
                "After successful authentication on the provider side, "
                "a redirect to the callback endpoint is performed.",
)
@api_view(["GET"])
@permission_classes([AllowAny])
def amazon_cognito_oauth2_login(*args, **kwargs):
    return OAuth2LoginView.adapter_view(AmazonCognitoAdapter)(*args, **kwargs)

@extend_schema(
    summary="Checks the authentication response from Google, redirects to the CVAT client if successful.",
    description="Accepts a request from Google with code and state query parameters. "
                "In case of successful authentication on the provider side, it will "
                "redirect to the CVAT client",
    parameters=[
        OpenApiParameter('code', description='Returned by google',
            location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
        OpenApiParameter('state', description='Returned by google',
            location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    ],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def google_oauth2_callback(*args, **kwargs):
    return OAuth2CallbackViewEx.adapter_view(GoogleAdapter)(*args, **kwargs)


@extend_schema(
    summary="Checks the authentication response from Amazon Cognito, redirects to the CVAT client if successful.",
    description="Accepts a request from Amazon Cognito with code and state query parameters. "
                "In case of successful authentication on the provider side, it will "
                "redirect to the CVAT client",
    parameters=[
        OpenApiParameter('code', description='Returned by google',
            location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
        OpenApiParameter('state', description='Returned by google',
            location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    ],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def amazon_cognito_oauth2_callback(*args, **kwargs):
    return OAuth2CallbackViewEx.adapter_view(AmazonCognitoAdapter)(*args, **kwargs)


class ConfirmEmailViewEx(ConfirmEmailView):
    template_name = 'account/email/email_confirmation_signup_message.html'

    def get(self, *args, **kwargs):
        try:
            if not allauth_settings.CONFIRM_EMAIL_ON_GET:
                return super().get(*args, **kwargs)
            return self.post(*args, **kwargs)
        except Http404:
            return HttpResponseRedirect(settings.INCORRECT_EMAIL_CONFIRMATION_URL)

@extend_schema(
    methods=['POST'],
    summary='Method returns an authentication token based on code parameter',
    description="After successful authentication on the provider side, "
                "the provider returns the 'code' parameter used to receive "
                "an authentication token required for CVAT authentication.",
    parameters=[
        OpenApiParameter('auth_params', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
        OpenApiParameter('process', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
        OpenApiParameter('scope', location=OpenApiParameter.QUERY, type=OpenApiTypes.STR),
    ],
    responses=get_token_serializer_class()
)
class SocialLoginViewEx(SocialLoginView):
    serializer_class = SocialLoginSerializerEx

    def post(self, request, *args, **kwargs):
        # we have to re-implement this method because
        # there is one case not covered by dj_rest_auth but covered by allauth
        # user can be logged in with social account and "unverified" email
        # (e.g. the provider doesn't provide information about email verification)

        self.request = request
        self.serializer = self.get_serializer(data=self.request.data)
        self.serializer.is_valid(raise_exception=True)

        if allauth_settings.EMAIL_VERIFICATION == allauth_settings.EmailVerificationMethod.MANDATORY and \
            not has_verified_email(self.serializer.validated_data.get('user')):
            return HttpResponseBadRequest('Unverified email')

        self.login()
        return self.get_response()

class GitHubLogin(SocialLoginViewEx):
    adapter_class = GitHubAdapter
    client_class = OAuth2Client
    callback_url = getattr(settings, 'GITHUB_CALLBACK_URL', None)

class GoogleLogin(SocialLoginViewEx):
    adapter_class = GoogleAdapter
    client_class = OAuth2Client
    callback_url = getattr(settings, 'GOOGLE_CALLBACK_URL', None)

class CognitoLogin(SocialLoginViewEx):
    adapter_class = AmazonCognitoAdapter
    client_class = OAuth2Client
    callback_url = getattr(settings, 'AMAZON_COGNITO_REDIRECT_URI', None)

@extend_schema_view(
    get=extend_schema(
        summary='Method provides a list with integrated social accounts authentication.',
        responses={
            '200': OpenApiResponse(response=inline_serializer(
                name="SocialAuthMethodsSerializer",
                fields={
                    'google': SocialAuthMethodSerializer(),
                    'github': SocialAuthMethodSerializer(),
                    'amazon-cognito': SocialAuthMethodSerializer(),
                }
            )),
        }
    )
)
class SocialAuthMethods(views.APIView):
    serializer_class = SocialAuthMethodSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    iam_organization_field = None

    def get(self,  request, *args, **kwargs):
        use_social_auth = settings.USE_ALLAUTH_SOCIAL_ACCOUNTS
        integrated_auth_providers = settings.SOCIALACCOUNT_PROVIDERS.keys() if use_social_auth else []

        response = dict()
        for provider in integrated_auth_providers:
            icon = None
            is_enabled = bool(
                getattr(settings, f'SOCIAL_AUTH_{provider.upper()}_CLIENT_ID', None)
                and getattr(settings, f'SOCIAL_AUTH_{provider.upper()}_CLIENT_SECRET', None)
            )
            icon_path = osp.join(settings.STATIC_ROOT, 'social_authentication', f'social-{provider.replace("_", "-")}-logo.svg')
            if is_enabled and osp.exists(icon_path):
                with open(icon_path, 'r') as f:
                    icon = f.read()

            serializer = SocialAuthMethodSerializer(data={
                'is_enabled': is_enabled,
                'icon': icon,
                'public_name': settings.SOCIALACCOUNT_PROVIDERS[provider].get('PUBLIC_NAME', provider.title())
            })
            serializer.is_valid(raise_exception=True)

            response[provider.replace("_", "-")] = serializer.validated_data

        return Response(response)
