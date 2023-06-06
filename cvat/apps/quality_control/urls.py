# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from cvat.apps.quality_control import views

router = routers.DefaultRouter(trailing_slash=False)
router.register("reports", views.QualityReportViewSet, basename="quality_reports")
router.register("conflicts", views.QualityConflictsViewSet, basename="annotation_conflicts")
router.register("settings", views.QualitySettingsViewSet, basename="quality_settings")

urlpatterns = [
    # entry point for API
    path("quality/", include(router.urls)),
]
