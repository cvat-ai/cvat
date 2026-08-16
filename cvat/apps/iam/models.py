# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models


class UserCreatedViaEnum(str, Enum):
    """How the account came into existence."""

    EMAIL_PASSWORD = "email_password"  # nosec
    SOCIAL = "social"
    SSO = "sso"
    LDAP = "ldap"
    INVITATION = "invitation"
    ADMIN = "admin"
    SYSTEM = "system"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class UserManager(DjangoUserManager):
    def create_superuser(self, *args, **kwargs):
        kwargs.setdefault("created_via", UserCreatedViaEnum.SYSTEM)
        return super().create_superuser(*args, **kwargs)


class User(AbstractUser):
    created_via = models.CharField(max_length=32, choices=UserCreatedViaEnum.choices(), null=True)

    objects = UserManager()

    class Meta(AbstractUser.Meta):
        db_table = "auth_user"
