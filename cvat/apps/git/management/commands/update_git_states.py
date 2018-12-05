# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand, CommandError
from cvat.apps.git.git import update_states
import time

INTERVAL_SEC = 600

class Command(BaseCommand):
    help = 'Run a regular updating for git status'

    def handle(self, *args, **options):
        while True:
            try:
                update_states()
            except Exception:
                pass
            time.sleep(INTERVAL_SEC)

