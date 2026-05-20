# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import TextChoices
from django.dispatch import Signal


class BackupStatus(TextChoices):
    COMPLETED = "completed"
    FAILED = "failed"


backup_finished = Signal()
