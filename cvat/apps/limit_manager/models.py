# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import auto

from django.db import models


class ConsumableCapability(models.TextChoices):
    TASK_CREATE = auto()
    PROJECT_CREATE = auto()
    ORG_CREATE = auto()
    CLOUD_STORAGE_CREATE = auto()
    WEBHOOK_CREATE = auto()

# class Limit
