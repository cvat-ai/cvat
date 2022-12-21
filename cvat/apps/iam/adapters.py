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
    def get_callback_url(self, request, app):
        return settings.GITHUB_CALLBACK_URL

class GoogleAdapter(GoogleOAuth2Adapter):
    def get_callback_url(self, request, app):
        return settings.GOOGLE_CALLBACK_URL
