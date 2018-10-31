
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig
from django.db.models.signals import post_migrate, post_save

class AuthenticationConfig(AppConfig):
    name = 'cvat.apps.authentication'

    def ready(self):
        from django.contrib.auth.models import User
        from . import signals
        from .settings.authentication import DJANGO_AUTH_TYPE, create_user

        post_migrate.connect(signals.create_groups)

        if DJANGO_AUTH_TYPE == 'SIMPLE':
            pass
            # post_save.connect(create_user, sender=User, dispatch_uid="create_user")
        elif DJANGO_AUTH_TYPE == 'LDAP':
            import django_auth_ldap.backend
            django_auth_ldap.backend.populate_user.connect(create_user)
