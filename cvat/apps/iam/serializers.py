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
