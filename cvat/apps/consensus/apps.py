# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig


class ConsensusConfig(AppConfig):
    name = "cvat.apps.consensus"

    def ready(self) -> None:

        from cvat.apps.iam.permissions import load_app_iam_rules

        load_app_iam_rules(self)

        # Required to define signals in the application
        from . import signals  # pylint: disable=unused-import
