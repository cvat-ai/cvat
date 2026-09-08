# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth.models import AbstractUser
from django.db import models


class UserCreationMethod(models.TextChoices):
    """How the account's credentials were first established."""

    REGISTRATION = "registration"
    SOCIAL = "social"
    SSO = "sso", "SSO"
    LDAP = "ldap", "LDAP"
    INVITATION = "invitation"


class User(AbstractUser):
    created_via = models.CharField(max_length=32, choices=UserCreationMethod.choices, null=True)

    class Meta(AbstractUser.Meta):
        db_table = "auth_user"
