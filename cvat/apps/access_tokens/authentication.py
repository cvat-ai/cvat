# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication

from . import models


class AccessTokenAuthentication(TokenAuthentication):
    keyword = "Bearer"

    def authenticate_credentials(self, key):
        model = models.AccessToken
        try:
            token = model.objects.get_from_key(key)
        except model.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid token.")

        if not token.owner.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")

        token.update_last_use()

        return (token.owner, token)
