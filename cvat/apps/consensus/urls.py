# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from cvat.apps.consensus import views

router = routers.DefaultRouter(trailing_slash=False)
router.register("reports", views.ConsensusReportViewSet, basename="consensus_reports")
router.register("settings", views.ConsensusSettingsViewSet, basename="consensus_settings")
router.register("conflicts", views.ConsensusConflictsViewSet, basename="conflicts")

urlpatterns = [
    # entry point for API
    path("consensus/", include(router.urls)),
]
