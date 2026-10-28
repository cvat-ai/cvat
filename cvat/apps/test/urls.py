# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from .views import AnnotationStatsViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("annotation-stats", AnnotationStatsViewSet, basename="annotation-stats")

urlpatterns = router.urls
