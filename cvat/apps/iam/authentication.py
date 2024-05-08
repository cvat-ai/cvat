# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.core import signing
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication
from rest_framework.authentication import TokenAuthentication
from django.contrib.auth import login
from django.contrib.auth import get_user_model
from furl import furl
import hashlib

# Got implementation ideas in https://github.com/marcgibbons/drf_signed_auth
class Signer:
    QUERY_PARAM = 'sign'
    MAX_AGE = 30

    @classmethod
    def get_salt(cls, url):
        normalized_url = furl(url).remove(cls.QUERY_PARAM).url.encode('utf-8')
        salt = hashlib.sha256(normalized_url).hexdigest()
        return salt

    def sign(self, user, url):
        """
        Create a signature for a user object.
        """
        data = {
            'user_id': user.pk,
            'username': user.get_username()
        }

        return signing.dumps(data, salt=self.get_salt(url))

    def unsign(self, signature, url):
        """
        Return a user object for a valid signature.
        """
        User = get_user_model()
        data = signing.loads(signature, salt=self.get_salt(url),
            max_age=self.MAX_AGE)

        if not isinstance(data, dict):
            raise signing.BadSignature()

        try:
            return User.objects.get(**{
                'pk': data.get('user_id'),
                User.USERNAME_FIELD: data.get('username')
            })
        except User.DoesNotExist:
            raise signing.BadSignature()

# Even with token authentication it is very important to have a valid session id
# in cookies because in some cases we cannot use token authentication (e.g. when
# we redirect to the server in UI using just URL). To overkill that we override
# the class to call `login` method which restores the session id in cookies.
class TokenAuthenticationEx(TokenAuthentication):
    def authenticate(self, request):
        auth = super().authenticate(request)
        # drf_spectacular uses mock requests without session field
        session = getattr(request, 'session', None)
        if (auth is not None and
            session is not None and
            (session.session_key is None or (not session.modified and not session.load()))):
            login(request, auth[0], 'django.contrib.auth.backends.ModelBackend')
        return auth

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
            raise exceptions.AuthenticationFailed('This URL has expired.')
        except signing.BadSignature:
            raise exceptions.AuthenticationFailed('Invalid signature.')
        if not user.is_active:
            raise exceptions.AuthenticationFailed('User inactive or deleted.')

        return (user, None)
