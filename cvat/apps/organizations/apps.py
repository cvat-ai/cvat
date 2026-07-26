# Copyright (C) 2021 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class OrganizationsConfig(AppConfig):
    name = "cvat.apps.organizations"

    def ready(self) -> None:
        from django.conf import settings

        from . import default_settings

        for key in dir(default_settings):
            if key.isupper() and not hasattr(settings, key):
                setattr(settings, key, getattr(default_settings, key))

        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)
