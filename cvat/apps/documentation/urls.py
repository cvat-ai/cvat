
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from . import views

urlpatterns = [
    path('user_guide.html', views.UserGuideView),
    path('xml_format.html', views.XmlFormatView),
]

