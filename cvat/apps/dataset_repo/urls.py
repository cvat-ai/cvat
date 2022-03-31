# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path, include
from rest_framework import routers
from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('datasetrepo', views.DatasetRepoViewSet, basename='datasetrepo')

urlpatterns = [
    path('api/', include(router.urls)),
]
