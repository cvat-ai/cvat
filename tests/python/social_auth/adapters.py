# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from django.conf import settings

GOOGLE_SERVER_PORT = os.environ.get("GOOGLE_SERVER_PORT")
GOOGLE_SERVER_HOST = os.environ.get("GOOGLE_SERVER_HOST")
GITHUB_SERVER_PORT = os.environ.get("GITHUB_SERVER_PORT")
GITHUB_SERVER_HOST = os.environ.get("GITHUB_SERVER_HOST")


class TestGitHubAdapter(GitHubOAuth2Adapter):
    access_token_url = (
        f"http://{GITHUB_SERVER_HOST}:{GITHUB_SERVER_PORT}/login/oauth/access_token"  # nosec
    )
    authorize_url = f"http://localhost:{GITHUB_SERVER_PORT}/login/oauth/authorize"
    profile_url = f"http://{GITHUB_SERVER_HOST}:{GITHUB_SERVER_PORT}/user"
    emails_url = f"http://{GITHUB_SERVER_HOST}:{GITHUB_SERVER_PORT}/user/emails"

    def get_callback_url(self, request, app):
        return settings.GITHUB_CALLBACK_URL


class TestGoogleAdapter(GoogleOAuth2Adapter):
    access_token_url = f"http://{GOOGLE_SERVER_HOST}:{GOOGLE_SERVER_PORT}/o/oauth2/token"
    authorize_url = f"http://localhost:{GOOGLE_SERVER_PORT}/o/oauth2/auth"
    profile_url = f"http://{GOOGLE_SERVER_HOST}:{GOOGLE_SERVER_PORT}/oauth2/v1/userinfo"

    def get_callback_url(self, request, app):
        return settings.GOOGLE_CALLBACK_URL
