# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth import get_user_model
from django.http import HttpResponseRedirect, HttpResponseBadRequest
from django.conf import settings

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.exceptions import ImmediateHttpResponse
from allauth.account.utils import filter_users_by_email

UserModel = get_user_model()

class DefaultAccountAdapterEx(DefaultAccountAdapter):
    def respond_email_verification_sent(self, request, user):
        return HttpResponseRedirect(settings.ACCOUNT_EMAIL_VERIFICATION_SENT_REDIRECT_URL)

class SocialAccountAdapterEx(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a
        social provider, but before the login is actually processed
        (and before the pre_social_login signal is emitted).
        """
        if sociallogin.is_existing:
            return

        if not sociallogin.email_addresses:
            raise ImmediateHttpResponse(response=HttpResponseBadRequest('No email is associated with this social account'))

        users = filter_users_by_email(sociallogin.user.email)
        if len(users) > 1:
            raise ImmediateHttpResponse(HttpResponseBadRequest(f'Cannot connect account with ${sociallogin.user.email} email.'))
        elif users:
            sociallogin.connect(request, users[0])
        return

class GitHubAdapter(GitHubOAuth2Adapter):
    if not settings.SOCIALACCOUNT_PROVIDERS['github'].get('TESTING'):
        access_token_url = GitHubOAuth2Adapter.access_token_url
        authorize_url = GitHubOAuth2Adapter.authorize_url
        profile_url = GitHubOAuth2Adapter.profile_url
        emails_url = GitHubOAuth2Adapter.emails_url
    else:
        access_token_url = "http://test-github:8084/login/oauth/access_token"
        authorize_url = "http://localhost:8084/login/oauth/authorize"
        profile_url = "http://test-github:8084/user"
        emails_url = "http://test-github:8084/user/emails"

    def get_callback_url(self, request, app):
        return settings.GITHUB_CALLBACK_URL

class GoogleAdapter(GoogleOAuth2Adapter):
    if not settings.SOCIALACCOUNT_PROVIDERS['google'].get('TESTING'):
        access_token_url = GoogleOAuth2Adapter.access_token_url
        authorize_url = GoogleOAuth2Adapter.authorize_url
        profile_url = GoogleOAuth2Adapter.profile_url
    else:
        access_token_url = f"http://test-google:8083/o/oauth2/token"
        authorize_url = f"http://localhost:8083/o/oauth2/auth"
        profile_url = f"http://test-google:8083/oauth2/v1/userinfo"

    def get_callback_url(self, request, app):
        return settings.GOOGLE_CALLBACK_URL
