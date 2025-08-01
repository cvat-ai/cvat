# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from rest_framework_api_key.admin import APIKey, APIKeyAdmin

from .models import ApiToken


class ApiTokenAdmin(APIKeyAdmin):
    list_display = list(APIKeyAdmin.list_display) + [
        "_is_stale",
        "read_only",
        "owner",
        "updated_date",
        "last_used_date",
    ]
    list_filter = ("owner__username", "created", "updated_date", "last_used_date", "read_only")
    search_fields = ("name", "prefix", "owner__username")


admin.site.unregister(APIKey)
admin.site.register(ApiToken, ApiTokenAdmin)
