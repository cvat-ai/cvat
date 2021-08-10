# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.contrib.auth.models import User, Group
from django.db.models.signals import post_migrate, post_save

def create_groups(sender, **kwargs):
    for role in settings.DJANGO_AUTH_ROLES:
        db_group, _ = Group.objects.get_or_create(name=role)
        db_group.save()

# Create all groups which corresponds system roles
post_migrate.connect(create_groups, weak=False)

if settings.DJANGO_AUTH_TYPE == 'BASIC':
    from allauth.account import app_settings as allauth_settings
    from allauth.account.models import EmailAddress

    def create_user(sender, instance, created, **kwargs):
        from django.contrib.auth.models import Group

        if instance.is_superuser and instance.is_staff:
            db_group = Group.objects.get(name=settings.DJANGO_AUTH_ADMIN)
            instance.groups.add(db_group)

            # create and verify EmailAddress for superuser accounts
            if allauth_settings.EMAIL_REQUIRED:
                EmailAddress.objects.get_or_create(user=instance,
                    email=instance.email, primary=True, verified=True)

        for role in settings.DJANGO_AUTH_DEFAULT_ROLES:
            db_group = Group.objects.get(name=role)
            instance.groups.add(db_group)

    # Add default groups and add admin rights to super users.
    post_save.connect(create_user, sender=User)

elif settings.DJANGO_AUTH_TYPE == 'LDAP':
    import django_auth_ldap.backend

    def create_user(sender, user=None, ldap_user=None, **kwargs):
        user_groups = []
        for role in settings.DJANGO_AUTH_ROLES:
            db_group = Group.objects.get(name=role)

            for ldap_group in settings.DJANGO_AUTH_LDAP_GROUPS[role]:
                if ldap_group.lower() in ldap_user.group_dns:
                    user_groups.append(db_group)
                    if role == settings.DJANGO_AUTH_ADMIN:
                        user.is_staff = user.is_superuser = True
                    break

        # It is important to save the user before adding groups. Please read
        # https://django-auth-ldap.readthedocs.io/en/latest/users.html#populating-users
        # The user instance will be saved automatically after the signal handler
        # is run.
        user.save()
        user.groups.set(user_groups)

    # Map groups from LDAP to roles
    django_auth_ldap.backend.populate_user.connect(create_user)
