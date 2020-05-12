# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
from . import AUTH_ROLE
from django.conf import settings
from importlib import import_module

def _import_role(role):
    assert isinstance(role, str)
    package, role_name = role.rsplit('.AUTH_ROLE.', 1)
    module = getattr(import_module(package), 'AUTH_ROLE')
    return getattr(module, role_name)

def create_user(sender, instance, created, **kwargs):
    from django.contrib.auth.models import Group

    if instance.is_superuser and instance.is_staff:
        db_group = Group.objects.get(name=AUTH_ROLE.ADMIN)
        instance.groups.add(db_group)
    for group in settings.DJANGO_AUTH_DEFAULT_GROUPS:
        db_group = Group.objects.get(name=_import_role(group))
        instance.groups.add(db_group)