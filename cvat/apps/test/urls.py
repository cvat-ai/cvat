# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path

from .views import ClassCountView

urlpatterns = [
    path("test/class-counts", ClassCountView.as_view(), name="analytics-class-counts"),
]
