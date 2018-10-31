# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth.models import Group
from .settings import AUTH_GROUP
from .settings.authentication import create_user

def create_groups(sender, **kwargs):
    for group in AUTH_GROUP:
        db_group, _ = Group.objects.get_or_create(name=group)
        db_group.save()
