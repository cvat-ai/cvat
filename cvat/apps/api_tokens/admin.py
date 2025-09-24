# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from rest_framework_api_key.admin import APIKey, APIKeyAdmin

from .models import ApiToken


class ApiTokenAdmin(APIKeyAdmin):
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
    search_fields = ("id", "name", "prefix", "owner__username")


admin.site.unregister(APIKey)
admin.site.register(ApiToken, ApiTokenAdmin)
