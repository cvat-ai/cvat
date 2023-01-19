# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.production import *

ACCOUNT_EMAIL_REQUIRED = True

if USE_ALLAUTH_SOCIAL_ACCOUNTS:
    SOCIALACCOUNT_GITHUB_ADAPTER = "social_auth.adapters.TestGitHubAdapter"
    SOCIALACCOUNT_GOOGLE_ADAPTER = "social_auth.adapters.TestGoogleAdapter"
