# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from .views import UpdatesViewSet, UserGrowthDataViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("growth", UserGrowthDataViewSet, basename="growth")
router.register("whats-new", UpdatesViewSet, basename="whats-new")

urlpatterns = router.urls
