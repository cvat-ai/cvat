# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT


from django.urls import path
from . import views


urlpatterns = [
    path('create', views.create_repository),
    path('update', views.update_repository),
    path('get/<int:jid>', views.get_repository),
    path('delete/<int:jid>', views.delete_repository),
]