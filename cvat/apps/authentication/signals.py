
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.db import models

from django.conf import settings
from .settings import authentication
from django.contrib.auth.models import User, Group

def setup_group_permissions(group):
    from cvat.apps.engine.models import Task
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType

    def append_permissions_for_model(model):
        content_type = ContentType.objects.get_for_model(model)
        for perm_target, actions in authentication.cvat_groups_definition[group.name]['permissions'].items():
            for action in actions:
                codename = '{}_{}'.format(action, perm_target)
                try:
                    perm = Permission.objects.get(codename=codename, content_type=content_type)
                    group_permissions.append(perm)
                except:
                    pass
    group_permissions = []
    append_permissions_for_model(Task)

    group.permissions.set(group_permissions)
    group.save()

def create_groups(sender, **kwargs):
    for cvat_role, _ in authentication.cvat_groups_definition.items():
        Group.objects.get_or_create(name=cvat_role)

def update_ldap_groups(sender, user=None, ldap_user=None, **kwargs):
    user_groups = []
    for cvat_role, role_settings in authentication.cvat_groups_definition.items():
        group_instance, _ = Group.objects.get_or_create(name=cvat_role)
        setup_group_permissions(group_instance)

        for ldap_group in role_settings['ldap_groups']:
            if ldap_group.lower() in ldap_user.group_dns:
                user_groups.append(group_instance)

    user.save()
    user.groups.set(user_groups)
    user.is_staff = user.is_superuser = user.groups.filter(name='admin').exists()

def create_user(sender, instance, created, **kwargs):
    if instance.is_superuser and instance.is_staff:
        admin_group, _ = Group.objects.get_or_create(name='admin')
        admin_group.user_set.add(instance)

    if created:
        for cvat_role, _ in authentication.cvat_groups_definition.items():
            group_instance, _ = Group.objects.get_or_create(name=cvat_role)
            setup_group_permissions(group_instance)

            if cvat_role in authentication.AUTH_SIMPLE_DEFAULT_GROUPS:
                instance.groups.add(group_instance)
