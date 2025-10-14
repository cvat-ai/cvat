# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib

from django.apps import AppConfig


class AccessTokensConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cvat.apps.access_tokens"
    verbose_name = "API Access Tokens"

    def ready(self):
        from django.conf import settings

        from . import default_settings

        for key in dir(default_settings):
            if key.isupper() and not hasattr(settings, key):
                setattr(settings, key, getattr(default_settings, key))

        # Force execution of symbols in the module.
        importlib.import_module(self.name + ".schema")

        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)
