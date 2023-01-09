# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.production import *

ACCOUNT_EMAIL_REQUIRED = True

if USE_ALLAUTH_SOCIAL_ACCOUNTS:
    SOCIALACCOUNT_GITHUB_ADAPTER = 'cvat.apps.iam.tests.adapters.TestGitHubAdapter'
    SOCIALACCOUNT_GOOGLE_ADAPTER = 'cvat.apps.iam.tests.adapters.TestGoogleAdapter'
