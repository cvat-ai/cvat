#!/usr/bin/env python

# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.settings.email_settings import *

if USE_ALLAUTH_SOCIAL_ACCOUNTS:
    for p in SOCIALACCOUNT_PROVIDERS.keys():
        SOCIALACCOUNT_PROVIDERS[p]['TESTING'] = True
