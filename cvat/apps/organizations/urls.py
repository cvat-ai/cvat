# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.routers import DefaultRouter
from .views import InvitationViewSet, MembershipViewSet, OrganizationViewSet

router = DefaultRouter(trailing_slash=False)
router.register('organizations', OrganizationViewSet)
router.register('invitations', InvitationViewSet)
router.register('memberships', MembershipViewSet)

urlpatterns = router.urls
