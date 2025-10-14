# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from django.conf import settings
from django.contrib import admin
from django.contrib.auth.models import User
from django.db import models
from django.db.models import functions as db_functions
from django.utils import timezone
from rest_framework_api_key.models import AbstractAPIKey, BaseAPIKeyManager

from cvat.apps.engine.model_utils import MaybeUndefined


class AccessTokenManager(BaseAPIKeyManager):
    def is_valid(self, key: str) -> bool:
        return super().is_valid(key) and not self.get_from_key(key).is_stale

    def get_usable_keys(self):
        return (
            super()
            .get_usable_keys()
            .exclude(expiry_date__lt=db_functions.Now())
            .annotate(
                _last_used=db_functions.Coalesce(
                    "last_used_date",
                    "created",
                    # updated_date is not included, because cases like "an unused token that's
                    # being renamed or changed otherwise every day" look suspicious at best.
                    # We want to track really used tokens here.
                )
            )
            .filter(_last_used__gte=db_functions.Now() - settings.ACCESS_TOKEN_STALE_PERIOD)
        )

    def assign_key(self, obj):
        result = super().assign_key(obj)
        obj.id = None  # do not use the library-assigned ids, we're using other ids
        return result


class AccessToken(AbstractAPIKey):
    # rest_framework_api_key and "classic" API keys are not recommended for authentication,
    # however we implement additional security measures to improve security of the tokens:
    # - Each token can have an expiration date
    # - Each token can be revoked at any time by the user or admin
    # - Server tracks the last usage for each token and unused tokens are automatically revoked
    # - Tokens have basic access control - read-only or not
    # - Token-authenticated clients are not allowed to modify tokens
    # - Token-authenticated clients are not allowed to modify the owning user email or password

    objects = AccessTokenManager()

    id = models.AutoField(primary_key=True)
    # 1. The default id field is a string with special characters, which can also expose
    # some implementation information.
    # 2. The PK is not used anywhere for the DRF API key logic, so it's pretty safe
    # to replace this field (since v3.0.0).
    # https://github.com/florimondmanca/djangorestframework-api-key/issues/128
    # 3. Alternative: add a separate sequence field to store a user-displayable id.
    # Requires a custom implementation, as Django doesn't support non-pk AutoField.
    # https://stackoverflow.com/questions/41228034/django-non-primary-key-autofield

    updated_date = models.DateTimeField(auto_now=True)
    last_used_date = models.DateTimeField(null=True, blank=True)

    read_only = models.BooleanField(default=True)

    owner = models.ForeignKey(
        User,
        related_name="access_tokens",
        related_query_name="access_token",
        on_delete=models.CASCADE,
    )

    raw_token: MaybeUndefined[str]
    "Can be specified by the calling serializer to report the generated raw token to the user."

    class Meta(AbstractAPIKey.Meta):
        verbose_name = "API Access Token"
        verbose_name_plural = "API Access Tokens"
        ordering = ("id",)

    def touch(self) -> None:
        self.save(update_fields=["updated_date"])

    def update_last_use(self) -> bool:
        now = timezone.now()

        # Throttle the updates to reduce the DB load
        if self.last_used_date and (
            now < self.last_used_date + settings.ACCESS_TOKEN_LAST_USE_UPDATE_MIN_INTERVAL
        ):
            return False

        # Update the token if it wasn't changed and if it's still valid
        is_updated = (
            AccessToken.objects.get_usable_keys()
            .filter(
                id=self.id,
                last_used_date=self.last_used_date,
            )
            .update(last_used_date=now)
            == 1
        )

        if is_updated:
            self.last_used_date = now

        return is_updated

    # Replace function with @property, once it's working
    # https://code.djangoproject.com/ticket/31558
    @admin.display(boolean=True, description="Is stale")
    def _is_stale(self):
        # check comment in get_usable_keys()
        return (
            self.last_used_date or self.created
        ) + settings.ACCESS_TOKEN_STALE_PERIOD < timezone.now()

    is_stale = property(_is_stale)
