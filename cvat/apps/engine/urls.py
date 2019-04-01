
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path, include
from . import views
from rest_framework import routers
from rest_framework.documentation import include_docs_urls
from rest_framework_swagger.views import get_swagger_view

schema_view = get_swagger_view(title='CVAT REST API')

router = routers.DefaultRouter(trailing_slash=False)
router.register('tasks', views.TaskViewSet)
router.register('jobs', views.JobViewSet)
router.register('users', views.UserViewSet)
router.register('server', views.ServerViewSet, basename='server')
router.register('plugins', views.PluginViewSet)

urlpatterns = [
    # Entry point for a client
    path('', views.dispatch_request),

    # documentation for API
    path('api/docs/', schema_view),
    # entry point for API
    path('api/v1/', include((router.urls, 'cvat'), namespace='v1'))
]
