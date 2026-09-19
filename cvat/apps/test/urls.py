# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register("class-counts", views.ClassCountsViewSet, basename="class-counts")

urlpatterns = router.urls
