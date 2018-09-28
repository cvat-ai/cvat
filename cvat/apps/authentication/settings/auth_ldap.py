
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
import ldap
from django_auth_ldap.config import LDAPSearch, NestedActiveDirectoryGroupType

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

AUTH_LDAP_ADMIN_GROUPS = [
    "cn=cvat_admins,ou=Groups,dc=example,dc=com"
]

AUTH_LDAP_DATA_ANNOTATORS_GROUPS = [
]

AUTH_LDAP_DEVELOPER_GROUPS = [
    "cn=cvat_users,ou=Groups,dc=example,dc=com"
]
