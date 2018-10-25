
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from .models import Task, Segment, Label, AttributeSpec

class SegmentInline(admin.TabularInline):
    model = Segment
    readonly_fields = ('start_frame', 'stop_frame')
    can_delete = False

    # Don't show on admin index page
    def has_add_permission(self, request, object=None):
        return False

class AttributeSpecInline(admin.TabularInline):
    model = AttributeSpec
    extra = 0
    max_num = None

class LabelInline(admin.TabularInline):
    model = Label
    show_change_link = True
    extra = 0
    max_num = None

class LabelAdmin(admin.ModelAdmin):
    # Don't show on admin index page
    def has_module_permission(self, request):
        return False

    inlines = [
        AttributeSpecInline
    ]


class TaskAdmin(admin.ModelAdmin):
    date_hierarchy = 'updated_date'
    readonly_fields = ('size', 'path', 'created_date', 'updated_date',
        'overlap', 'flipped')
    list_display = ('name', 'mode', 'owner', 'created_date', 'updated_date')
    search_fields = ('name', 'mode', 'owner_username', 'owner_first_name',
        'owner_last_name', 'owner_email')
    inlines = [
        SegmentInline,
        LabelInline
    ]

    # A callable object to use inside search_fields
    def owner_first_name(self, obj):
        return obj.owner.first_name

    # A callable object to use inside search_fields
    def owner_last_name(self, obj):
        return obj.owner.last_name

    # A callable object to use inside search_fields
    def owner_email(self, obj):
        return obj.owner.email

    # Don't allow to add a task because it isn't trivial operation
    def has_add_permission(self, request):
        return False


admin.site.register(Task, TaskAdmin)
admin.site.register(Label, LabelAdmin)
