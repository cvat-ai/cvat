
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig

class AuthenticationConfig(AppConfig):
    name = 'cvat.apps.authentication'

    def ready(self):
        from .auth import register_signals

        register_signals()
