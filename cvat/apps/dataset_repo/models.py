# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models
from cvat.apps.engine.models import Task
from cvat.apps.engine.utils import DjangoEnum, StrEnum

class GitStatusChoice(DjangoEnum, StrEnum):
    NON_SYNCED = '!sync'
    SYNCING = 'syncing'
    SYNCED = 'sync'
    MERGED = 'merged'

class GitData(models.Model):
    task = models.OneToOneField(Task, on_delete = models.CASCADE, primary_key = True)
    url = models.URLField(max_length = 2000)
    path = models.CharField(max_length=256)
    format = models.CharField(max_length=256, blank=True)
    sync_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default=GitStatusChoice.NON_SYNCED)
    lfs = models.BooleanField(default=True)
