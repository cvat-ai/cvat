# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from allauth.socialaccount.providers.amazon_cognito.views import AmazonCognitoOAuth2Adapter
from django.conf import settings


class TestAmazonCognitoOAuth2Adapter(AmazonCognitoOAuth2Adapter):
    @property
    def profile_url(self):
        return super().profile_url.lower()

    def get_callback_url(self, request, app):
        return settings.AMAZON_COGNITO_REDIRECT_URI
