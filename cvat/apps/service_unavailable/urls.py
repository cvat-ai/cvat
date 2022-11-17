# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from . import views

from django.urls import re_path

urlpatterns = [
    re_path(r'.*', views.DBFailureView.as_view()),
]
