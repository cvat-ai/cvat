# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from rest_framework import routers
from django.urls import include
from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('functions', views.FunctionViewSet)

# GET  /api/v1/lambda/functions - get list of functions
# POST /api/v1/lambda/functions - add one more function
# GET  /api/v1/lambda/functions/<int:fid> - get information about the function
# DEL  /api/v1/lambda/functions/<int:fid> - delete a function
# POST /api/v1/labmda/functions/<int:fid>/requests - call a function
# GET  /api/v1/lambda/functions/<int:fid>/requests - get list of requests
# GET  /api/v1/lambda/functions/<int:fid>/requests/<int:rid> - get information about the call
# DEL  /api/v1/lambda/functions/<int:fid>/requests/<int:rid> - cancel a request (don't delete)
urlpatterns = [
    path('api/v1/lambda', include((router.urls, 'cvat'), namespace='v1'))
]