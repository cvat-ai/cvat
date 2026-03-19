# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT


from allauth.account import app_settings as allauth_settings
from allauth.account.models import EmailAddress
from rest_framework import exceptions
from rest_framework.authentication import BasicAuthentication


class BasicAuthenticationEx(BasicAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)

        if (
            allauth_settings.EMAIL_VERIFICATION
            == allauth_settings.EmailVerificationMethod.MANDATORY
            and result
        ):
            user = result[0]
            if not EmailAddress.objects.is_verified(user.email):
                raise exceptions.AuthenticationFailed("E-mail is not verified.")

        return result
