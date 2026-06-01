# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import multiprocessing
from importlib import import_module

from django.conf import settings

_rqworker_pool = import_module("django_rq.management.commands.rqworker-pool")


class Command(_rqworker_pool.Command):
    help = (
        "Runs an RQ worker pool with the multiprocessing start method pinned by "
        "settings.CVAT_RQ_POOL_MULTIPROCESSING_START_METHOD (see redis_handler.default_settings)."
    )

    def handle(self, *args, **options) -> None:
        multiprocessing.set_start_method(settings.CVAT_RQ_POOL_MULTIPROCESSING_START_METHOD)
        return super().handle(*args, **options)
