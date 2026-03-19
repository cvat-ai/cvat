# Copyright (C) 2020-2021 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class LambdaManagerConfig(AppConfig):
    name = "cvat.apps.lambda_manager"

    def ready(self) -> None:
        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)
