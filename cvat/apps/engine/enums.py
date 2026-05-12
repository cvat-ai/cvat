# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import TextChoices


class BackupStatus(TextChoices):
    COMPLETED = "completed"
    FAILED = "failed"
