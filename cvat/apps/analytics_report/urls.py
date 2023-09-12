# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register("analytics/reports", views.AnalyticsReportViewSet, basename="analytics_reports")

urlpatterns = router.urls
