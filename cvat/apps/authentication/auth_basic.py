# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
from . import AUTH_ROLE


# Specify groups that new users will have by default
AUTH_DEFAULT_GROUPS = [AUTH_ROLE.OBSERVER]

def create_user(sender, user, created, **kwargs):
    from django.contrib.auth.models import Group

    if user.is_superuser and user.is_staff:
        db_group = Group.objects.get(name=AUTH_ROLE.ADMIN)
        user.groups.add(db_group)

    if created:
        for group in AUTH_DEFAULT_GROUPS:
            db_group = Group.objects.get(name=group)
            user.groups.add(db_group)
