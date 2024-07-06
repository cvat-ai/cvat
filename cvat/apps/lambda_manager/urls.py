# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework import routers

from . import views

router = routers.DefaultRouter(trailing_slash=False)
# https://github.com/encode/django-rest-framework/issues/6645
# I want to "call" my functions. To do that need to map my call method to
# POST (like get HTTP method is mapped to list(...)). One way is to implement
# own CustomRouter. But it is simpler just patch the router instance here.
router.routes[2].mapping.update({'post': 'call'})
router.register('functions', views.FunctionViewSet, basename='lambda_function')
router.register('requests', views.RequestViewSet, basename='lambda_request')

# GET  /api/lambda/functions - get list of functions
# GET  /api/lambda/functions/<int:fid> - get information about the function
# POST /api/lambda/requests - call a function
# { "function": "<id>", "mode": "online|offline", "job": "<jid>", "frame": "<n>",
#   "points": [...], }
# GET  /api/lambda/requests - get list of requests
# GET  /api/lambda/requests/<int:rid> - get status of the request
# DEL  /api/lambda/requests/<int:rid> - cancel a request (don't delete)
urlpatterns = [
    path('api/lambda/', include(router.urls))
]
