# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
from . import AUTH_ROLE


# Specify groups that new users will have by default
AUTH_DEFAULT_GROUPS = [AUTH_ROLE.OBSERVER]

def create_user(sender, instance, created, **kwargs):
    from django.contrib.auth.models import Group

    if instance.is_superuser and instance.is_staff:
        db_group = Group.objects.get(name=AUTH_ROLE.ADMIN)
        instance.groups.add(db_group)

    if created:
        for group in AUTH_DEFAULT_GROUPS:
            db_group = Group.objects.get(name=group)
            instance.groups.add(db_group)
