# Copyright (C) 2018-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from allauth.account import app_settings as allauth_settings
from allauth.account.models import EmailAddress

def create_user(sender, instance, created, **kwargs):
    from django.contrib.auth.models import Group

    if instance.is_superuser and instance.is_staff:
        db_group = Group.objects.get(name=settings.DJANGO_AUTH_ADMIN)
        instance.groups.add(db_group)

        # create and verify EmailAddress for superuser accounts
        if allauth_settings.EMAIL_REQUIRED:
            EmailAddress.objects.get_or_create(user=instance, email=instance.email, primary=True, verified=True)

    for role in settings.DJANGO_AUTH_DEFAULT_ROLES:
        db_group = Group.objects.get(name=role)
        instance.groups.add(db_group)
