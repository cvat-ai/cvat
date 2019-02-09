# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models
from cvat.apps.engine.models import Task
from enum import Enum

class GitStatusChoice(Enum):
    NON_SYNCED = '!sync'
    SYNCING = 'syncing'
    SYNCED = 'sync'
    MERGED = 'merged'

    def __str__(self):
        return self.value


class GitData(models.Model):
    task = models.OneToOneField(Task, on_delete = models.CASCADE, primary_key = True)
    url = models.URLField(max_length = 2000)
    path = models.CharField(max_length=256)
    sync_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default=GitStatusChoice.NON_SYNCED)
    lfs = models.BooleanField(default=True)
