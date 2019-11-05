
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path('create/task/<int:tid>', views.create),
    path('check/task/<int:tid>', views.check),
    path('cancel/task/<int:tid>', views.cancel),
    path('meta/get', views.get_meta_info),
]
