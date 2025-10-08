# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import hashlib

from allauth.account import app_settings as allauth_settings
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import signing
from furl import furl
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication, BasicAuthentication


# Got implementation ideas in https://github.com/marcgibbons/drf_signed_auth
class Signer:
    QUERY_PARAM = "sign"
    MAX_AGE = 30

    @classmethod
    def get_salt(cls, url):
        normalized_url = furl(url).remove(cls.QUERY_PARAM).url.encode("utf-8")
        salt = hashlib.sha256(normalized_url).hexdigest()
        return salt

    def sign(self, user, url):
        """
        Create a signature for a user object.
        """
        data = {"user_id": user.pk, "username": user.get_username()}

        return signing.dumps(data, salt=self.get_salt(url))

    def unsign(self, signature, url):
        """
        Return a user object for a valid signature.
        """
        User = get_user_model()
        data = signing.loads(signature, salt=self.get_salt(url), max_age=self.MAX_AGE)

        if not isinstance(data, dict):
            raise signing.BadSignature()

        try:
            return User.objects.get(
                **{"pk": data.get("user_id"), User.USERNAME_FIELD: data.get("username")}
            )
        except User.DoesNotExist:
            raise signing.BadSignature()


class SignatureAuthentication(BaseAuthentication):
    """
    Authentication backend for signed URLs.
    """

    def authenticate(self, request):
        """
        Returns authenticated user if URL signature is valid.
        """
        signer = Signer()
        sign = request.query_params.get(Signer.QUERY_PARAM)
        if not sign:
            return

        try:
            user = signer.unsign(sign, request.build_absolute_uri())
        except signing.SignatureExpired:
            raise exceptions.AuthenticationFailed("This URL has expired.")
        except signing.BadSignature:
            raise exceptions.AuthenticationFailed("Invalid signature.")
        if not user.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")

        return (user, None)


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
