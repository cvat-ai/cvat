# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.contrib.auth.models import User, Group
from django.contrib.sites.shortcuts import get_current_site
from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from allauth.account.adapter import get_adapter
from allauth.account.signals import user_signed_up, email_confirmed
from allauth.account.utils import user_email
from allauth.account import app_settings as allauth_settings

def register_groups(sender, **kwargs):
    # Create all groups which corresponds system roles
    for role in settings.IAM_ROLES:
        Group.objects.get_or_create(name=role)

if settings.IAM_TYPE == 'BASIC':
    def create_user(sender, instance, created, **kwargs):
        from allauth.account.models import EmailAddress

        if instance.is_superuser and instance.is_staff:
            db_group = Group.objects.get(name=settings.IAM_ADMIN_ROLE)
            instance.groups.add(db_group)

            # create and verify EmailAddress for superuser accounts
            if allauth_settings.EMAIL_REQUIRED:
                EmailAddress.objects.get_or_create(user=instance,
                    email=instance.email, primary=True, verified=True)
        else: # don't need to add default groups for superuser
            if created:
                for role in settings.IAM_DEFAULT_ROLES:
                    db_group = Group.objects.get(name=role)
                    instance.groups.add(db_group)

elif settings.IAM_TYPE == 'LDAP':
    def create_user(sender, user=None, ldap_user=None, **kwargs):
        user_groups = []
        for role in settings.IAM_ROLES:
            db_group = Group.objects.get(name=role)

            for ldap_group in settings.DJANGO_AUTH_LDAP_GROUPS[role]:
                if ldap_group.lower() in ldap_user.group_dns:
                    user_groups.append(db_group)
                    if role == settings.IAM_ADMIN_ROLE:
                        user.is_staff = user.is_superuser = True
                    break

        # It is important to save the user before adding groups. Please read
        # https://django-auth-ldap.readthedocs.io/en/latest/users.html#populating-users
        # The user instance will be saved automatically after the signal handler
        # is run.
        user.save()
        user.groups.set(user_groups)


def register_signals(app_config):
    post_migrate.connect(register_groups, app_config)
    if settings.IAM_TYPE == 'BASIC':
        # Add default groups and add admin rights to super users.
        post_save.connect(create_user, sender=User)
    elif settings.IAM_TYPE == 'LDAP':
        import django_auth_ldap.backend
        # Map groups from LDAP to roles, convert a user to super user if he/she
        # has an admin group.
        django_auth_ldap.backend.populate_user.connect(create_user)

@receiver([user_signed_up, email_confirmed], dispatch_uid='send_welcome_email_after_sign_up_or_email_verification')
def send_welcome_email(request, **kwargs):
    """
        Send welcome email in 2 cases:
        - CVAT server is configured with MANDATORY email verification and the user has confirmed the email (handle email_confirmed signal)
        - CVAT server is configured with OPTIONAL or NONE email verification policy and the user has signed up (handle user_signed_up signal)
        signal user_signed_up provides: request, user
        signal email_confirmed provides: request, email_address
    """

    def _is_mandatory_email_verification():
        return (
            settings.ACCOUNT_EMAIL_VERIFICATION
            == allauth_settings.EmailVerificationMethod.MANDATORY
        )

    def _define_user_and_email():
        if (user := kwargs.get('user')):
            return user, user_email(user)
        else:
            email_instance = kwargs['email_address']
            return email_instance.user, email_instance.email

    user, email = _define_user_and_email()
    adapter = get_adapter(request)

    send_email = bool(
        email
        and (
            (
                not _is_mandatory_email_verification()
                and 'register' in request.path
            )
            or (
                _is_mandatory_email_verification() and 'account-confirm-email' in request.path
            )
        )
    )
    if send_email:
        context={
            'email': email,
            'request': request,
            'user': user,
            'current_site': get_current_site(request)
        }
        adapter.send_mail(template_prefix='account/email/welcome', email=email, context=context)
