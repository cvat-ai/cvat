# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from cvat.apps.honeypots import views

router = routers.DefaultRouter(trailing_slash=False)
router.register("reports", views.HoneypotsReportViewSet, basename="honeypot_reports")

urlpatterns = [
    # entry point for API
    path("honeypots/", include(router.urls)),
]
