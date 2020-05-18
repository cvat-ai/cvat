# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from rest_framework import routers
from django.urls import include
from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('functions', views.FunctionViewSet)
router.register('requests', views.RequestViewSet)

# GET  /api/v1/lambda/functions - get list of functions
# GET  /api/v1/lambda/functions/<int:fid> - get information about the function
# POST /api/v1/labmda/requests - call a function
# { "function": "<id>", "mode": "online|offline", "job": "<jid>", "frame": "<n>",
#   "points": [...], }
# GET  /api/v1/lambda/requests - get list of requests
# GET  /api/v1/lambda/requests/<int:rid> - get status of the request
# DEL  /api/v1/lambda/requests/<int:rid> - cancel a request (don't delete)
urlpatterns = [
    path('api/v1/lambda', include((router.urls, 'cvat'), namespace='v1'))
]