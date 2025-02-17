# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.throttling import UserRateThrottle


class ResendOrganizationInvitationThrottle(UserRateThrottle):
    rate = "5/hour"
