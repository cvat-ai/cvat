
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
import ldap
from django_auth_ldap.config import LDAPSearch, NestedActiveDirectoryGroupType
from . import AUTH_ROLE

# Baseline configuration.
settings.AUTH_LDAP_SERVER_URI = ""

# Credentials for LDAP server
settings.AUTH_LDAP_BIND_DN = ""
settings.AUTH_LDAP_BIND_PASSWORD = ""

# Set up basic user search
settings.AUTH_LDAP_USER_SEARCH = LDAPSearch("dc=example,dc=com",
    ldap.SCOPE_SUBTREE, "(sAMAccountName=%(user)s)")

# Set up the basic group parameters.
settings.AUTH_LDAP_GROUP_SEARCH = LDAPSearch("dc=example,dc=com",
    ldap.SCOPE_SUBTREE, "(objectClass=group)")
settings.AUTH_LDAP_GROUP_TYPE = NestedActiveDirectoryGroupType()

# # Simple group restrictions
settings.AUTH_LDAP_REQUIRE_GROUP = "cn=cvat,ou=Groups,dc=example,dc=com"

# Populate the Django user from the LDAP directory.
settings.AUTH_LDAP_USER_ATTR_MAP = {
    "first_name": "givenName",
    "last_name": "sn",
    "email": "mail",
}

settings.AUTH_LDAP_ALWAYS_UPDATE_USER = True

# Cache group memberships for an hour to minimize LDAP traffic
settings.AUTH_LDAP_CACHE_GROUPS = True
settings.AUTH_LDAP_GROUP_CACHE_TIMEOUT = 3600
settings.AUTH_LDAP_AUTHORIZE_ALL_USERS = True

# Keep ModelBackend around for per-user permissions and maybe a local
# superuser.
settings.AUTHENTICATION_BACKENDS.append('django_auth_ldap.backend.LDAPBackend')

AUTH_LDAP_GROUPS = {
    AUTH_ROLE.ADMIN: "cn=cvat_admins,ou=Groups,dc=example,dc=com",
    AUTH_ROLE.ANNOTATOR: "cn=cvat_annotators,ou=Groups,dc=example,dc=com",
    AUTH_ROLE.USER: "cn=cvat_users,ou=Groups,dc=example,dc=com",
    AUTH_ROLE.OBSERVER: "cn=cvat_observers,ou=Groups,dc=example,dc=com"
}

def create_user(sender, user=None, ldap_user=None, **kwargs):
    from django.contrib.auth.models import Group
    user_groups = []
    for role in AUTH_ROLE:
        db_group = Group.objects.get(name=role)

        for ldap_group in AUTH_LDAP_GROUPS[role]:
            if ldap_group.lower() in ldap_user.group_dns:
                user_groups.append(db_group)

    user.groups.set(user_groups)
    user.is_staff = user.is_superuser = (AUTH_ROLE.ADMIN in user_groups)
    user.save()

