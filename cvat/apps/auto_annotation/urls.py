
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path("create/model", views.create_model),
    path("update/model/<int:mid>", views.update_model),
    path("delete/model/<int:mid>", views.delete_model),
    path("start/<int:mid>/<int:tid>", views.start_annotation),
    path("check/<str:rd_id>", views.check),
    path("meta/get", views.get_meta_info),
]
