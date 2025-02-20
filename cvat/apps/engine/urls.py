# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework import routers

from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('projects', views.ProjectViewSet)
router.register('tasks', views.TaskViewSet)
router.register('jobs', views.JobViewSet)
router.register('users', views.UserViewSet)
router.register('server', views.ServerViewSet, basename='server')
router.register('issues', views.IssueViewSet)
router.register('comments', views.CommentViewSet)
router.register('labels', views.LabelViewSet)
router.register('cloudstorages', views.CloudStorageViewSet)
router.register('assets', views.AssetsViewSet)
router.register('guides', views.AnnotationGuidesViewSet)
router.register('requests', views.RequestViewSet,  basename="request")

urlpatterns = [
    # Entry point for a client
    path('', RedirectView.as_view(url=settings.UI_URL, permanent=True,
         query_string=True)),

    # documentation for API
    path('api/schema/', SpectacularAPIView.as_view(
        permission_classes=[] # This endpoint is available for everyone
    ), name='schema'),
    path('api/swagger/', SpectacularSwaggerView.as_view(
        url_name='schema',
        permission_classes=[] # This endpoint is available for everyone
    ), name='swagger'),
    path('api/docs/', SpectacularRedocView.as_view(
        url_name='schema',
        permission_classes=[] # This endpoint is available for everyone
    ), name='redoc'),

    # entry point for API
    path('api/', include('cvat.apps.iam.urls')),
    path('api/', include('cvat.apps.organizations.urls')),
    path('api/', include(router.urls)),
]
