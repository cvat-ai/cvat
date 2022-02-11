
# Copyright (C) 2018-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path, include
from . import views
from rest_framework import routers

from django.views.generic import RedirectView
from django.conf import settings
from cvat.apps.restrictions.views import RestrictionsViewSet

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

router = routers.DefaultRouter(trailing_slash=False)
router.register('projects', views.ProjectViewSet)
router.register('tasks', views.TaskViewSet)
router.register('jobs', views.JobViewSet)
router.register('users', views.UserViewSet)
router.register('server', views.ServerViewSet, basename='server')
router.register('issues', views.IssueViewSet)
router.register('comments', views.CommentViewSet)
router.register('restrictions', RestrictionsViewSet, basename='restrictions')
router.register('cloudstorages', views.CloudStorageViewSet)

urlpatterns = [
    # Entry point for a client
    path('', RedirectView.as_view(url=settings.UI_URL, permanent=True,
         query_string=True)),

    # documentation for API
    path('api/schema/', SpectacularAPIView.as_view(api_version='2.0'), name='schema'),
    path('api/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger'),
    path('api/docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # entry point for API
    path('api/', include('cvat.apps.iam.urls')),
    path('api/', include('cvat.apps.organizations.urls')),
    path('api/', include(router.urls)),
]
