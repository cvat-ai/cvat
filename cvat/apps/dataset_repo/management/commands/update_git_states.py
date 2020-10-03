# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand
from cvat.apps.dataset_repo.dataset_repo import update_states
import time

INTERVAL_SEC = 600

class Command(BaseCommand):
    help = 'Run a regular updating for git status'

    def handle(self, *args, **options):
        while True:
            try:
                update_states()
            except Exception as ex:
                print("An error occured during update task statuses: {}".format(str(ex)))
            time.sleep(INTERVAL_SEC)

