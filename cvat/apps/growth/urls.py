# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from .views import UserGrowthDataViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("growth", UserGrowthDataViewSet, basename="growth")

urlpatterns = router.urls
