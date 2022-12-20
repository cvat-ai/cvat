# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.routers import DefaultRouter
from .views import LimitationViewSet

router = DefaultRouter(trailing_slash=False)
router.register("limitations", LimitationViewSet, basename="limitation")

urlpatterns = router.urls
