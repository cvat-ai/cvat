# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group, User
from django.utils.translation import gettext_lazy as _

from cvat.apps.engine.models import Profile


class ProfileInline(admin.StackedInline):
    model = Profile

    fieldsets = ((None, {"fields": ("has_analytics_access",)}),)


class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline,)
    list_display = ("username", "email", "first_name", "last_name", "is_active", "is_staff")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "email")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                )
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "password1", "password2"),
            },
        ),
    )
    actions = ["user_activate", "user_deactivate"]

    @admin.action(permissions=["change"], description=_("Mark selected users as active"))
    def user_activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(permissions=["change"], description=_("Mark selected users as not active"))
    def user_deactivate(self, request, queryset):
        queryset.update(is_active=False)


class CustomGroupAdmin(GroupAdmin):
    fieldsets = ((None, {"fields": ("name",)}),)


admin.site.unregister(User)
admin.site.unregister(Group)
admin.site.register(User, CustomUserAdmin)
admin.site.register(Group, CustomGroupAdmin)
