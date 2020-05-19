# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
from . import AUTH_ROLE
from django.conf import settings

def create_user(sender, instance, created, **kwargs):
    from django.contrib.auth.models import Group

    if instance.is_superuser and instance.is_staff:
        db_group = Group.objects.get(name=AUTH_ROLE.ADMIN)
        instance.groups.add(db_group)
    for group_name in settings.DJANGO_AUTH_DEFAULT_GROUPS:
        db_group = Group.objects.get(name=getattr(AUTH_ROLE, group_name))
        instance.groups.add(db_group)
