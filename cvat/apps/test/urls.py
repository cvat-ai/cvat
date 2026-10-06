# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path

from .views import TaskAnnotationCountsView

urlpatterns = [
    path(
        "test/tasks/<int:pk>/annotation-counts",
        TaskAnnotationCountsView.as_view(),
        name="task-annotation-counts",
    ),
    path(
        "test/tasks/<int:pk>/counts",
        TaskAnnotationCountsView.as_view(),
        name="task-annotation-counts-short",
    ),
]
