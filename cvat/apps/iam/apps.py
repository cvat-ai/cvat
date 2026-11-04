# Copyright (C) 2021 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class IAMConfig(AppConfig):
    name = "cvat.apps.iam"

    def ready(self):
        from .signals import register_signals

        register_signals(self)

        from cvat.apps.iam.email_validation import get_email_validators

        get_email_validators()
