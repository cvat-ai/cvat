# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import TextChoices
from django.dispatch import Signal


class ExportStatus(TextChoices):
    COMPLETED = "completed"
    FAILED = "failed"


export_finished = Signal()
