
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path, include
from . import views as engine_views
from rest_framework import routers
from rest_framework import permissions
from rest_framework.authtoken import views as obtain_auth_token_views
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="CVAT REST API",
      default_version='v1',
      description="REST API for Computer Vision Annotation Tool (CVAT)",
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="nikita.manovich@intel.com"),
      license=openapi.License(name="MIT License"),
   ),
   public=True,
   permission_classes=(permissions.IsAuthenticated,),
)

router = routers.DefaultRouter(trailing_slash=False)
router.register('tasks', engine_views.TaskViewSet)
router.register('jobs', engine_views.JobViewSet)
router.register('users', engine_views.UserViewSet)
router.register('server', engine_views.ServerViewSet, basename='server')
router.register('plugins', engine_views.PluginViewSet)

urlpatterns = [
    # Entry point for a client
    path('', engine_views.dispatch_request),

    # documentation for API
    path('api/swagger.<slug:format>$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('api/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/docs/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    # entry point for API
    path('api-token-auth/', obtain_auth_token_views.obtain_auth_token),
    path('api/v1/auth/', include('cvat.apps.authentication.api_urls')),
    path('api/v1/', include((router.urls, 'cvat'), namespace='v1'))
]
