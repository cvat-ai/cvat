# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import PasswordResetSerializer, LoginSerializer
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from allauth.account import app_settings
from allauth.account.utils import filter_users_by_email
from allauth.account.adapter import get_adapter
from allauth.utils import email_address_exists, get_username_max_length
from allauth.account.utils import setup_user_email

from django.conf import settings

from cvat.apps.iam.forms import ResetPasswordFormEx

class RegisterSerializerEx(RegisterSerializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data.update({
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
        })

        return data

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if app_settings.UNIQUE_EMAIL:
            if email and email_address_exists(email):
                # Allow to pass email for dummy users
                users = filter_users_by_email(email)
                if not users or len(users) > 1:
                    raise serializers.ValidationError(
                        ('A user is already registered with this e-mail address.'),
                    )
                ## TODO: check that user has inactive params
                user = users[0]
                print(user.username)

        return email

    def save(self, request):
        adapter = get_adapter()
        user = adapter.new_user(request)
        self.cleaned_data = self.get_cleaned_data()
        override_save = False
        ## TODO: make this into function
        if self.cleaned_data["email"] and email_address_exists(self.cleaned_data["email"]):
            # Allow to pass email for dummy users
            users = filter_users_by_email(self.cleaned_data["email"])
            if not users or len(users) > 1:
                raise serializers.ValidationError(
                        ('A user is already registered with this e-mail address.'),
                    )
            ## TODO: check that user has inactive params
            user = users[0]
            override_save = True
        user = adapter.save_user(request, user, self, commit=False)
        if "password1" in self.cleaned_data:
            try:
                adapter.clean_password(self.cleaned_data['password1'], user=user)
            except ValidationError as exc:
                raise serializers.ValidationError(
                    detail=serializers.as_serializer_error(exc)
            )
        user.is_active = True
        user.save()
        self.custom_signup(request, user)
        ## TODO check if we need that for non-default users
        if not override_save:
            setup_user_email(request, user, [])
        return user


class PasswordResetSerializerEx(PasswordResetSerializer):
    @property
    def password_reset_form_class(self):
        return ResetPasswordFormEx

    def get_email_options(self):
        domain = None
        if hasattr(settings, 'UI_HOST') and settings.UI_HOST:
            domain = settings.UI_HOST
            if hasattr(settings, 'UI_PORT') and settings.UI_PORT:
                domain += ':{}'.format(settings.UI_PORT)
        return {
            'domain_override': domain
        }

class LoginSerializerEx(LoginSerializer):
    def get_auth_user_using_allauth(self, username, email, password):

        def is_email_authentication():
            return settings.ACCOUNT_AUTHENTICATION_METHOD == app_settings.AuthenticationMethod.EMAIL

        def is_username_authentication():
            return settings.ACCOUNT_AUTHENTICATION_METHOD == app_settings.AuthenticationMethod.USERNAME

        # check that the server settings match the request
        if is_username_authentication() and not username and email:
            raise ValidationError(
                'Attempt to authenticate with email/password. '
                'But username/password are used for authentication on the server. '
                'Please check your server configuration ACCOUNT_AUTHENTICATION_METHOD.')

        if is_email_authentication() and not email and username:
            raise ValidationError(
                'Attempt to authenticate with username/password. '
                'But email/password are used for authentication on the server. '
                'Please check your server configuration ACCOUNT_AUTHENTICATION_METHOD.')

        # Authentication through email
        if settings.ACCOUNT_AUTHENTICATION_METHOD == app_settings.AuthenticationMethod.EMAIL:
            return self._validate_email(email, password)

        # Authentication through username
        if settings.ACCOUNT_AUTHENTICATION_METHOD == app_settings.AuthenticationMethod.USERNAME:
            return self._validate_username(username, password)

        # Authentication through either username or email
        if email:
            users = filter_users_by_email(email)
            if not users or len(users) > 1:
                raise ValidationError('Unable to login with provided credentials')

        return self._validate_username_email(username, email, password)
