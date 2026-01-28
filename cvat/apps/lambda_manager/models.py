# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import django.db.models as models


class FunctionKind(models.TextChoices):
    DETECTOR = "detector"
    INTERACTOR = "interactor"
    REID = "reid"
    TRACKER = "tracker"
