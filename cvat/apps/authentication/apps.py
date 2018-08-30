
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig
from django.db.models.signals import post_migrate, post_save
from .settings.authentication import DJANGO_AUTH_TYPE

class AuthenticationConfig(AppConfig):
    name = 'cvat.apps.authentication'

    def ready(self):
        from . import signals
        from django.contrib.auth.models import User

        post_migrate.connect(signals.create_groups)

        if DJANGO_AUTH_TYPE == 'SIMPLE':
            post_save.connect(signals.create_user, sender=User, dispatch_uid="create_user")

        import django_auth_ldap.backend
        django_auth_ldap.backend.populate_user.connect(signals.update_ldap_groups)
