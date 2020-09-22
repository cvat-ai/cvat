# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

"""CVAT URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.apps import apps
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('cvat.apps.engine.urls')),
    path('django-rq/', include('django_rq.urls')),
    path('documentation/', include('cvat.apps.documentation.urls')),
]

if apps.is_installed('cvat.apps.git'):
    urlpatterns.append(path('git/repository/', include('cvat.apps.git.urls')))

if apps.is_installed('cvat.apps.log_viewer'):
    urlpatterns.append(path('analytics/', include('cvat.apps.log_viewer.urls')))

if apps.is_installed('cvat.apps.lambda_manager'):
    urlpatterns.append(path('', include('cvat.apps.lambda_manager.urls')))

if apps.is_installed('silk'):
    urlpatterns.append(path('profiler/', include('silk.urls')))
