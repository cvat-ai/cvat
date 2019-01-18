
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path("create", views.create_model),
    path("update/<int:mid>", views.update_model),
    path("delete/<int:mid>", views.delete_model),

    path("start/<int:mid>/<int:tid>", views.start_annotation),
    path("check/<str:rq_id>", views.check),
    path("cancel/<int:tid>", views.cancel),

    path("meta/get", views.get_meta_info),
]
