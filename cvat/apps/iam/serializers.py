# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from allauth.account import app_settings as allauth_settings
from allauth.account.adapter import get_adapter
from allauth.account.utils import filter_users_by_email, setup_user_email
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer, PasswordResetSerializer
from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from cvat.apps.iam.forms import ResetPasswordFormEx
from cvat.apps.iam.utils import get_dummy_or_regular_user


class RegisterSerializerEx(RegisterSerializer):
    # workaround for https://github.com/iMerica/dj-rest-auth/issues/707
    email = serializers.EmailField(
        required=allauth_settings.EMAIL_REQUIRED, max_length=allauth_settings.EMAIL_MAX_LENGTH
    )

    first_name = serializers.CharField(
        required=False, max_length=User._meta.get_field("first_name").max_length
    )
    last_name = serializers.CharField(
        required=False, max_length=User._meta.get_field("last_name").max_length
    )

    email_verification_required = serializers.SerializerMethodField()
    key = serializers.SerializerMethodField()

    @extend_schema_field(serializers.BooleanField)
    def get_email_verification_required(self, obj: dict | User) -> bool:
        return (
            allauth_settings.EMAIL_VERIFICATION
            == allauth_settings.EmailVerificationMethod.MANDATORY
        )

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_key(self, obj: dict | User) -> str | None:
        key = None
        if (
            isinstance(obj, User)
            and allauth_settings.EMAIL_VERIFICATION
            != allauth_settings.EmailVerificationMethod.MANDATORY
        ):
            key = obj.auth_token.key
        return key

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data.update(
            {
                "first_name": self.validated_data.get("first_name", ""),
                "last_name": self.validated_data.get("last_name", ""),
            }
        )

        return data

    def save(self, request):
        adapter = get_adapter()
        self.cleaned_data = self.get_cleaned_data()

        dummy_user, regular_user = get_dummy_or_regular_user(self.cleaned_data["email"])
        # A regular user registered via standard sign-up or social login method;
        # has an unverified email address
        if regular_user:
            raise serializers.ValidationError(
                _("A user is already registered with this e-mail address.")
            )

        # Allow to overwrite data for dummy users
        user = dummy_user or adapter.new_user(request)

        user = adapter.save_user(request, user, self, commit=False)
        if "password1" in self.cleaned_data:
            try:
                adapter.clean_password(self.cleaned_data["password1"], user=user)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(detail=serializers.as_serializer_error(exc))
        user.save()
        self.custom_signup(request, user)

        setup_user_email(request, user, [])
        return user


class PasswordResetSerializerEx(PasswordResetSerializer):
    @property
    def password_reset_form_class(self):
        return ResetPasswordFormEx

    def get_email_options(self):
        domain = None
        if hasattr(settings, "UI_HOST") and settings.UI_HOST:
            domain = settings.UI_HOST
            if hasattr(settings, "UI_PORT") and settings.UI_PORT:
                domain += ":{}".format(settings.UI_PORT)
        return {"domain_override": domain}


class LoginSerializerEx(LoginSerializer):
    def get_auth_user_using_allauth(self, username, email, password):

        def is_email_authentication():
            return (
                settings.ACCOUNT_AUTHENTICATION_METHOD
                == allauth_settings.AuthenticationMethod.EMAIL
            )

        def is_username_authentication():
            return (
                settings.ACCOUNT_AUTHENTICATION_METHOD
                == allauth_settings.AuthenticationMethod.USERNAME
            )

        # check that the server settings match the request
        if is_username_authentication() and not username and email:
            raise ValidationError(
                "Attempt to authenticate with email/password. "
                "But username/password are used for authentication on the server. "
                "Please check your server configuration ACCOUNT_AUTHENTICATION_METHOD."
            )

        if is_email_authentication() and not email and username:
            raise ValidationError(
                "Attempt to authenticate with username/password. "
                "But email/password are used for authentication on the server. "
                "Please check your server configuration ACCOUNT_AUTHENTICATION_METHOD."
            )

        # Authentication through email
        if settings.ACCOUNT_AUTHENTICATION_METHOD == allauth_settings.AuthenticationMethod.EMAIL:
            return self._validate_email(email, password)

        # Authentication through username
        if settings.ACCOUNT_AUTHENTICATION_METHOD == allauth_settings.AuthenticationMethod.USERNAME:
            return self._validate_username(username, password)

        # Authentication through either username or email
        if email:
            users = filter_users_by_email(email)
            if not users or len(users) > 1:
                raise ValidationError("Unable to login with provided credentials")

        return self._validate_username_email(username, email, password)
