# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from .views import TaskClassCountsViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("tasks", TaskClassCountsViewSet, basename="test-task-class-counts")

urlpatterns = [
    path("test/", include(router.urls)),
]
