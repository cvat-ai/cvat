
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

def create_user(sender, user=None, ldap_user=None, **kwargs):
    from django.contrib.auth.models import Group
    user_groups = []
    for role in settings.DJANGO_AUTH_ROLES:
        db_group = Group.objects.get(name=role)

        for ldap_group in settings.DJANGO_AUTH_LDAP_GROUPS[role]:
            if ldap_group.lower() in ldap_user.group_dns:
                user_groups.append(db_group)
                if role == settings.DJANGO_AUTH_ADMIN:
                    user.is_staff = user.is_superuser = True
                break

    # It is important to save the user before adding groups. Please read
    # https://django-auth-ldap.readthedocs.io/en/latest/users.html#populating-users
    # The user instance will be saved automatically after the signal handler
    # is run.
    user.save()
    user.groups.set(user_groups)
