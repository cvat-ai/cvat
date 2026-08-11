# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dirtyfields import DirtyFieldsMixin
from django.contrib.auth.models import AbstractUser


class User(DirtyFieldsMixin, AbstractUser):
    class Meta(AbstractUser.Meta):
        db_table = "auth_user"
