# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Adds User.created_via and backfills it for existing users by inferring the registration
flow from related DB records. Use cases:
1. Invited to an org, accepted, registered with email+password -> invitation
2. Invited, accepted via a social login with the same email -> invitation
3. Invited, but registered via a social login with a different email -> social
   (a separate user is created; the invitation stays with the pre-created one)
4. Invited, never accepted -> invitation
5. Invited, accepted, registered, then the invitation was deleted:
   expected invitation, reality email_password/social - the invitation row is gone,
   there is nothing left to detect it by
6. Registered via Google/GitHub/Cognito -> social, even if the user later obtained a
   usable password via password reset: the social account was linked within
   _SAME_REQUEST_WINDOW of date_joined, which wins over the password check
7. Registered via OIDC/SAML -> sso
8. Registered with email+password -> email_password, even if a social account was
   connected later (linked more than _SAME_REQUEST_WINDOW after date_joined)
9. Being invited to an org after registration never changes the value: that invitation
   is created more than _SAME_REQUEST_WINDOW after date_joined
10. Created by createsuperuser, or promoted to superuser later:
    expected system/null respectively, reality system for all superusers - ordinary
    logins may create EmailAddress rows for them (mandatory email verification),
    so no evidence-based check is reliable.
11. Created via django admin or directly in the DB -> null
12. IAM_TYPE == "LDAP": every user -> ldap
13. Invited, but did not accept the invite and the invitation was deleted -> invitation
14. Anything else -> null
"""

from datetime import timedelta
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
    SYSTEM = "system"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


_SOCIAL_PROVIDER_IDS = (GoogleProvider.id, GitHubProvider.id, AmazonCognitoProvider.id)

_SAME_REQUEST_WINDOW = timedelta(seconds=30)


def created_via_expression(apps):
    if settings.IAM_TYPE == "LDAP":
        return Value(UserCreatedViaEnum.LDAP)

    SocialAccount = apps.get_model("socialaccount", "SocialAccount")
    EmailAddress = apps.get_model("account", "EmailAddress")
    Invitation = apps.get_model("organizations", "Invitation")

    social = SocialAccount.objects.filter(user_id=OuterRef("pk"))

    # linked in the same request as the user was created
    social_at_signup = social.filter(date_joined__lt=OuterRef("date_joined") + _SAME_REQUEST_WINDOW)

    # created in the same request as the user
    invitation_created = Invitation.objects.filter(
        membership__user_id=OuterRef("pk"),
        created_date__lt=OuterRef("date_joined") + _SAME_REQUEST_WINDOW,
    )

    emails = EmailAddress.objects.filter(user_id=OuterRef("pk"))

    whens = [
        When(Q(is_superuser=True), then=Value(UserCreatedViaEnum.SYSTEM)),
        When(Exists(invitation_created), then=Value(UserCreatedViaEnum.INVITATION)),
        When(
            Exists(social_at_signup.filter(provider__in=_SOCIAL_PROVIDER_IDS)),
            then=Value(UserCreatedViaEnum.SOCIAL),
        ),
        When(Exists(social_at_signup), then=Value(UserCreatedViaEnum.SSO)),
        When(
            Q(Exists(emails)) & ~Q(password__startswith=UNUSABLE_PASSWORD_PREFIX),
            then=Value(UserCreatedViaEnum.EMAIL_PASSWORD),
        ),
        When(
            Exists(social.filter(provider__in=_SOCIAL_PROVIDER_IDS)),
            then=Value(UserCreatedViaEnum.SOCIAL),
        ),
        When(Exists(social), then=Value(UserCreatedViaEnum.SSO)),
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
