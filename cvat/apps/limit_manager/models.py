# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models

import cvat.apps.limit_manager.core.limits as core


class ConsumableCapability(core.ConsumableCapability, models.TextChoices):
    pass

# class Limit
