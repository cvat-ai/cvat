# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig
from .permissions import setup_permissions

class ReidConfig(AppConfig):
    name = 'cvat.apps.reid'

    def ready(self):
        setup_permissions()