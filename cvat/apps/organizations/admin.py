# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .models import Organization
from django.contrib import admin

class OrganizationAdmin(admin.ModelAdmin):
    model = Organization
    search_fields = ('slug', 'type')
    list_display = ('id', 'slug', 'name')

admin.site.register(Organization, OrganizationAdmin)
