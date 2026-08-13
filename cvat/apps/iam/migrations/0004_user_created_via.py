# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

from allauth.socialaccount.providers.amazon_cognito.provider import AmazonCognitoProvider
from allauth.socialaccount.providers.github.provider import GitHubProvider
from allauth.socialaccount.providers.google.provider import GoogleProvider
from django.conf import settings
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.db import migrations, models
from django.db.models import Case, Exists, OuterRef, Q, Value, When

import cvat.apps.iam.models


class UserCreatedViaEnum(str, Enum):
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


_SOCIAL_PROVIDER_IDS = (GoogleProvider.id, GitHubProvider.id, AmazonCognitoProvider.id)


def created_via_expression(apps):
    if settings.IAM_TYPE == "LDAP":
        return Value(UserCreatedViaEnum.LDAP)

    SocialAccount = apps.get_model("socialaccount", "SocialAccount")
    EmailAddress = apps.get_model("account", "EmailAddress")
    Invitation = apps.get_model("organizations", "Invitation")

    social = SocialAccount.objects.filter(user_id=OuterRef("pk"))
    emails = EmailAddress.objects.filter(user_id=OuterRef("pk"))
    invited = Invitation.objects.filter(membership__user_id=OuterRef("pk"))

    whens = [
        When(Q(is_superuser=True), then=Value(UserCreatedViaEnum.SYSTEM)),
        When(Exists(invited), then=Value(UserCreatedViaEnum.INVITATION)),
        When(
            Exists(social.filter(provider__in=_SOCIAL_PROVIDER_IDS)),
            then=Value(UserCreatedViaEnum.SOCIAL),
        ),
        When(Exists(social), then=Value(UserCreatedViaEnum.SSO)),
        When(
            Q(Exists(emails)) & ~Q(password__startswith=UNUSABLE_PASSWORD_PREFIX),
            then=Value(UserCreatedViaEnum.EMAIL_PASSWORD),
        ),
        When(
            ~Q(Exists(emails)) & Q(password__startswith=UNUSABLE_PASSWORD_PREFIX),
            then=Value(UserCreatedViaEnum.INVITATION),
        ),
    ]

    return Case(*whens)


def backfill_created_via(apps, schema_editor):
    User = apps.get_model("iam", "User")
    User.objects.filter(created_via__isnull=True).update(created_via=created_via_expression(apps))


class Migration(migrations.Migration):

    dependencies = [
        ("iam", "0003_move_user_content_type"),
        ("account", "0001_initial"),
        ("socialaccount", "0001_initial"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelManagers(
            name="user",
            managers=[
                ("objects", cvat.apps.iam.models.UserManager()),
            ],
        ),
        migrations.AddField(
            model_name="user",
            name="created_via",
            field=models.CharField(
                choices=[
                    ("email_password", "EMAIL_PASSWORD"),
                    ("social", "SOCIAL"),
                    ("sso", "SSO"),
                    ("ldap", "LDAP"),
                    ("invitation", "INVITATION"),
                    ("admin", "ADMIN"),
                    ("system", "SYSTEM"),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.RunPython(
            backfill_created_via,
            migrations.RunPython.noop,
        ),
    ]
