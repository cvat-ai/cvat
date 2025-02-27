# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin

from .models import Membership, Organization


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0

    radio_fields = {
        "role": admin.VERTICAL,
    }

    autocomplete_fields = ("user",)


class OrganizationAdmin(admin.ModelAdmin):
    search_fields = ("slug", "name", "owner__username")
    list_display = ("id", "slug", "name")

    autocomplete_fields = ("owner",)

    inlines = [MembershipInline]


admin.site.register(Organization, OrganizationAdmin)
