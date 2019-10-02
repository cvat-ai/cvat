
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from . import AUTH_ROLE

AUTH_LDAP_GROUPS = {
    AUTH_ROLE.ADMIN: settings.AUTH_LDAP_ADMIN_GROUPS,
    AUTH_ROLE.ANNOTATOR: settings.AUTH_LDAP_ANNOTATOR_GROUPS,
    AUTH_ROLE.USER: settings.AUTH_LDAP_USER_GROUPS,
    AUTH_ROLE.OBSERVER: settings.AUTH_LDAP_OBSERVER_GROUPS
}

def create_user(sender, user=None, ldap_user=None, **kwargs):
    from django.contrib.auth.models import Group
    user_groups = []
    for role in AUTH_ROLE:
        db_group = Group.objects.get(name=role)

        for ldap_group in AUTH_LDAP_GROUPS[role]:
            if ldap_group.lower() in ldap_user.group_dns:
                user_groups.append(db_group)
                if role == AUTH_ROLE.ADMIN:
                    user.is_staff = user.is_superuser = True

    # It is important to save the user before adding groups. Please read
    # https://django-auth-ldap.readthedocs.io/en/latest/users.html#populating-users
    # The user instance will be saved automatically after the signal handler
    # is run.
    user.save()
    user.groups.set(user_groups)
