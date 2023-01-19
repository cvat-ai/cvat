# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.production import *

ACCOUNT_EMAIL_REQUIRED = True

if USE_ALLAUTH_SOCIAL_ACCOUNTS:
    SOCIALACCOUNT_AMAZON_COGNITO_ADAPTER = "mock_oauth2.adapters.TestAmazonCognitoOAuth2Adapter"
