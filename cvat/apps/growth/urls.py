# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from .update_views import UpdatesViewSet
from .views import UserGrowthDataViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("growth", UserGrowthDataViewSet, basename="growth")
router.register("product-updates", UpdatesViewSet, basename="product-updates")

urlpatterns = router.urls
