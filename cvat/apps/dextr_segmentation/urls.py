# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path('create/<int:jid>', views.create),
    path('cancel/<int:jid>', views.cancel),
    path('check/<int:jid>', views.check),
    path('enabled', views.enabled)
]
