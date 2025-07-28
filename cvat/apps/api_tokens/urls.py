# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from django.urls.conf import include
from rest_framework import routers

from .views import ApiTokensViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("api_tokens", ApiTokensViewSet, basename="api_token")

urlpatterns = [
    path("auth/", include(router.urls)),
]
