# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT


from django.urls import path
from . import views


urlpatterns = [
    path('create', views.create_repository),
    path('update', views.update_repository),
    path('get/<int:tid>', views.get_repository),
    path('delete/<int:tid>', views.delete_repository),
    path('push/<int:tid>', views.push_repository),
]
