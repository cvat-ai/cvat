# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework_api_key.models import AbstractAPIKey, BaseAPIKeyManager

from cvat.apps.engine.model_utils import MaybeUndefined


def get_token_stale_period() -> timedelta:
    return settings.API_TOKEN_STALE_PERIOD


class ApiTokenManager(BaseAPIKeyManager):
    def is_valid(self, key: str) -> bool:
        return super().is_valid(key) and not self.get_from_key(key).is_stale

    def get_usable_keys(self):
        now = timezone.now()
        return (
            super()
            .get_usable_keys()
            .exclude(expiry_date__lt=now)
            .annotate(_last_used=Coalesce("last_used_date", "created"))
            .filter(_last_used__gte=now - get_token_stale_period())
        )

    def assign_key(self, obj):
        result = super().assign_key(obj)
        obj.id = None  # do not use the library-assigned ids, we're using other ids
        return result


class ApiToken(AbstractAPIKey):
    # rest_framework_api_key is not supposed for authentication,
    # however we implement additional security measures to protect API tokens.
    objects = ApiTokenManager()

    id = models.AutoField(primary_key=True)
    # 1. The default id field is a string with special characters, which can also expose
    # some implementation information.
    # 2. The PK is not used anywhere for the API key logic, so it's pretty safe
    # to replace this field (since v3.0.0).
    # https://github.com/florimondmanca/djangorestframework-api-key/issues/128
    # 3. Alternative: add a separate sequence field to store a user-displayable id.
    # Requires a custom implementation, as Django doesn't support non-pk AutoField.
    # https://stackoverflow.com/questions/41228034/django-non-primary-key-autofield

    updated_date = models.DateTimeField(auto_now=True)
    last_used_date = models.DateTimeField(null=True, blank=True)

    read_only = models.BooleanField(default=True)

    user = models.ForeignKey(
        User,
        related_name="api_tokens",
        related_query_name="api_token",
        on_delete=models.CASCADE,
    )

    raw_token: MaybeUndefined[str]
    "Can be specified by the calling serializer to report the generated raw token to the user."

    class Meta(AbstractAPIKey.Meta):
        verbose_name = "API Token"
        verbose_name_plural = "API Tokens"
        ordering = ()

    def touch(self) -> None:
        self.save(update_fields=["updated_date"])

    def update_last_use(self) -> bool:
        now = timezone.now()

        # Throttle the updates to reduce the DB load
        if self.last_used_date and (
            now < self.last_used_date + settings.API_TOKEN_LAST_USE_UPDATE_MIN_INTERVAL
        ):
            return False

        # Update the token if it wasn't changed and if it's still valid
        is_updated = (
            ApiToken.objects.get_usable_keys()
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

    def _is_stale(self):
        return (self.last_used_date or self.created) + get_token_stale_period() < timezone.now()

    _is_stale.short_description = "Is stale"  # type: ignore
    _is_stale.boolean = True  # type: ignore
    is_stale = property(_is_stale)
