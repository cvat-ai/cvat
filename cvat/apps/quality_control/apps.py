# Copyright (C) 2023 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class QualityControlConfig(AppConfig):
    name = "cvat.apps.quality_control"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)

        # Define signals, apply schema customizations
        from . import schema, signals  # pylint: disable=unused-import
