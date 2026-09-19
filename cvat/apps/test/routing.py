# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import re_path

from .consumers import ClassCountsConsumer

websocket_urlpatterns = [
    re_path(r"^ws/test/class-counts/(?P<task_id>\d+)/$", ClassCountsConsumer.as_asgi()),
]
