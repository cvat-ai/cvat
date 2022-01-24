# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

#from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import InvitationViewSet, MembershipViewSet, OrganizationViewSet

router = DefaultRouter(trailing_slash=False)
router.register('organizations', OrganizationViewSet)
router.register('invitations', InvitationViewSet)
router.register('memberships', MembershipViewSet)

urlpatterns = router.urls
#urlpatterns = [path('', include((router.urls, 'organizations'), namespace='v1'))]
