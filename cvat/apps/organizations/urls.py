# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.routers import DefaultRouter
from .views import MemberViewSet, OrganizationViewSet

router = DefaultRouter(trailing_slash=False)
router.register('organizations', OrganizationViewSet)

urlpatterns = router.urls