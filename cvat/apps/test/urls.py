# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path

from .views import TaskClassCountsView

urlpatterns = [
    path("tasks/<int:task_id>/class-counts", TaskClassCountsView.as_view()),
]
