# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models

import cvat.apps.limit_manager.core.limits as core


class Limits(core.Limits, models.TextChoices):
    pass
