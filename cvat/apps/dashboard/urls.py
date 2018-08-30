
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path('get_share_nodes', views.JsTreeView),
    path('', views.DashboardView),
]

