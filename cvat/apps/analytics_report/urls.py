
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('analytics/report', views.AnalyticsReportViewSet, basename='analytics_report')

urlpatterns = router.urls
