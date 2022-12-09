#!/usr/bin/env python

# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.email_settings import *

if USE_ALLAUTH_SOCIAL_ACCOUNTS:
    SOCIALACCOUNT_GITHUB_ADAPTER = 'cvat.apps.iam.adapters.TestGitHubAdapter'
    SOCIALACCOUNT_GOOGLE_ADAPTER = 'cvat.apps.iam.adapters.TestGoogleAdapter'
