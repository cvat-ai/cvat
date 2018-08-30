
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
import os

settings.LOGIN_URL = 'login'
settings.LOGIN_REDIRECT_URL = '/'

settings.AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

AUTH_LDAP_DEVELOPER_GROUPS = []
AUTH_LDAP_DATA_ANNOTATORS_GROUPS = []
AUTH_LDAP_ADMIN_GROUPS = []

DJANGO_AUTH_TYPE = 'LDAP' if os.environ.get('DJANGO_AUTH_TYPE', '') == 'LDAP' else 'SIMPLE'

if DJANGO_AUTH_TYPE == 'LDAP':
    from .auth_ldap import *
else:
    from .auth_simple import *

# Definition of CVAT groups with permissions for task and annotation objects
# Annotator - can modify annotation for task, but cannot add, change and delete tasks
# Developer - can create tasks and modify (delete) owned tasks and any actions with annotation
# Admin - can any actions for task and annotation, can login to admin area and manage groups and users
cvat_groups_definition = {
    'user': {
        'description': '',
        'permissions': {
            'task': ['view', 'add', 'change', 'delete'],
            'annotation': ['view', 'change'],
            },
        'ldap_groups': AUTH_LDAP_DEVELOPER_GROUPS,
    },

    'annotator': {
        'description': '',
        'permissions':  {
            'task': ['view'],
            'annotation': ['view', 'change'],
            },
        'ldap_groups': AUTH_LDAP_DATA_ANNOTATORS_GROUPS,
    },

    'admin': {
        'description': '',
        'permissions':  {
            'task': ['view', 'add', 'change', 'delete'],
            'annotation': ['view', 'change'],
            },
        'ldap_groups': AUTH_LDAP_ADMIN_GROUPS,
    },
}
