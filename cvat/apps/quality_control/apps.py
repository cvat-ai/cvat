# Copyright (C) 2023 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class QualityControlConfig(AppConfig):
    name = "cvat.apps.quality_control"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_permissions

        load_app_permissions(self)

        # Required to define signals in the application
        from . import signals  # pylint: disable=unused-import
