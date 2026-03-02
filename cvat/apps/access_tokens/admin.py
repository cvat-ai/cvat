# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from django.contrib.admin.sites import NotRegistered
from rest_framework_api_key.admin import APIKeyAdmin
from rest_framework_api_key.models import APIKey as APIKeyModel

from .models import AccessToken


class AccessTokenAdmin(APIKeyAdmin):
    list_display = [
        "id",
        "owner",
        *APIKeyAdmin.list_display,
        "_is_stale",
        "read_only",
        "updated_date",
        "last_used_date",
    ]
    list_filter = ("created", "updated_date", "last_used_date", "read_only")
    # Use exact-match on id to avoid inefficient substring search on integers
    search_fields = ("=id", "name", "prefix", "owner__username")
    autocomplete_fields = ("owner",)


# Unregister the upstream APIKey model admin if it was registered.
# Guard against NotRegistered to avoid import-time errors if it's absent.
try:
    admin.site.unregister(APIKeyModel)
except NotRegistered:
    # If not registered, nothing to do.
    pass

admin.site.register(AccessToken, AccessTokenAdmin)
