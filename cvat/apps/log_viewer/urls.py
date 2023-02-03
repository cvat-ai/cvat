
# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('analytics', views.LogViewerAccessViewSet, basename='analytics')

urlpatterns = router.urls
