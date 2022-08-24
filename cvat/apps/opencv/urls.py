
# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT
from django.urls import path
from . import views

urlpatterns = [
    path('opencv.js', views.OpenCVLibrary)
]
