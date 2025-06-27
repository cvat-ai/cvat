# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.throttling import UserRateThrottle

from cvat.utils.throttle import SharedCacheThrottle


class ResendOrganizationInvitationThrottle(SharedCacheThrottle, UserRateThrottle):
    rate = "5/hour"
