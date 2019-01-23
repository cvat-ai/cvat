# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path('create/job/<int:jid>', views.create),
    path('cancel/<str:rq_id>', views.cancel),
    path('check/<str:rq_id>', views.check),
]
