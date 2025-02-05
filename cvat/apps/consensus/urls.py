# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from cvat.apps.consensus import views

router = routers.DefaultRouter(trailing_slash=False)
router.register("merges", views.ConsensusMergesViewSet, basename="consensus_merges")
router.register("settings", views.ConsensusSettingsViewSet, basename="consensus_settings")

urlpatterns = [
    # entry point for API
    path("consensus/", include(router.urls)),
]
