
# Copyright (C) 2018-2024 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from .models import Task, Segment, Job, Label, AttributeSpec, Project, \
    CloudStorage, Storage, Data, AnnotationGuide, Asset

class JobInline(admin.TabularInline):
    model = Job
    can_delete = False

    autocomplete_fields = ('assignee', )
    readonly_fields = ('type', )

    def has_add_permission(self, request, obj):
        return False

class SegmentInline(admin.TabularInline):
    model = Segment
    show_change_link = True
    readonly_fields = ('start_frame', 'stop_frame')
    can_delete = False

    def has_add_permission(self, request, obj):
        return False

class AttributeSpecInline(admin.TabularInline):
    model = AttributeSpec
    extra = 0
    max_num = None

    readonly_fields = ('mutable', 'input_type', 'default_value', 'values')

    def has_add_permission(self, _request, obj):
        return False

class LabelInline(admin.TabularInline):
    model = Label
    show_change_link = True
    extra = 0
    max_num = None

    readonly_fields = ('task', 'project', 'parent', 'type')

class AssetInline(admin.TabularInline):
    model = Asset
    extra = 0
    max_num = None

    list_display = ('__str__', )
    readonly_fields = ('filename', 'created_date')
    autocomplete_fields = ('owner', )

    def has_add_permission(self, _request, obj):
        return False


class DataAdmin(admin.ModelAdmin):
    model = Data
    fields = ('chunk_size', 'size', 'image_quality', 'start_frame', 'stop_frame', 'frame_filter', 'compressed_chunk_type', 'original_chunk_type')
    readonly_fields = fields
    autocomplete_fields = ('cloud_storage', )

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_module_permission(self, request):
        return False

    def has_add_permission(self, _request):
        return False

class StorageAdmin(admin.ModelAdmin):
    model = Storage
    list_display = ('__str__', 'location', 'cloud_storage')
    autocomplete_fields = ('cloud_storage', )

    def has_module_permission(self, request):
        return False

    def has_add_permission(self, _request):
        return False

class LabelAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'name', 'type', 'task', 'project')
    search_fields = ('name', 'task__name', 'project__name')
    readonly_fields = ('task', 'project', 'parent', 'type')

    def has_add_permission(self, _request):
        return False

    inlines = [
        AttributeSpecInline
    ]

class SegmentAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'task', 'start_frame', 'stop_frame', 'type')
    search_fields = ('task__name', )
    readonly_fields = ('task', 'start_frame', 'stop_frame', 'type', 'frames')

    def has_delete_permission(self, request, obj=None):
        return False

    def has_module_permission(self, request):
        return False

    inlines = [
        JobInline
    ]

class ProjectAdmin(admin.ModelAdmin):
    date_hierarchy = 'created_date'
    list_display = ('name', 'organization', 'owner', 'created_date', 'updated_date', 'status')
    search_fields = ('name', 'owner__username', 'owner__first_name',
        'owner__last_name', 'owner__email', 'assignee__username', 'assignee__first_name',
        'assignee__last_name', 'organization__slug')

    radio_fields = {
        'status': admin.VERTICAL,
    }

    readonly_fields = ('created_date', 'updated_date')
    autocomplete_fields = ('owner', 'assignee', 'organization')
    raw_id_fields = ('source_storage', 'target_storage')

    inlines = [
        LabelInline
    ]

    def has_add_permission(self, _request):
        return False

class TaskAdmin(admin.ModelAdmin):
    date_hierarchy = 'created_date'
    list_display = ('name', 'dimension', 'mode', 'organization', 'owner', 'assignee', 'created_date', 'updated_date')
    search_fields = ('name', 'mode', 'owner__username', 'owner__first_name',
        'owner__last_name', 'owner__email', 'assignee__username', 'assignee__first_name',
        'assignee__last_name', 'organization__slug')

    radio_fields = {
        'status': admin.VERTICAL,
    }

    readonly_fields = ('created_date', 'updated_date', 'overlap', 'segment_size', 'data', 'dimension')
    autocomplete_fields = ('project', 'owner', 'assignee', 'organization')
    raw_id_fields = ('source_storage', 'target_storage', 'data')

    inlines = [
        SegmentInline,
        LabelInline
    ]

    def has_add_permission(self, request):
        return False

class CloudStorageAdmin(admin.ModelAdmin):
    date_hierarchy = 'created_date'
    list_display = ('__str__', 'resource', 'owner', 'created_date', 'updated_date')
    search_fields = ('provider_type', 'display_name', 'resource', 'owner__username', 'owner__first_name',
        'owner__last_name', 'owner__email', 'organization__slug')

    radio_fields = {
        'credentials_type': admin.VERTICAL,
    }

    readonly_fields = ('created_date', 'updated_date', 'provider_type')
    autocomplete_fields = ('owner', 'organization')

    def has_add_permission(self, request):
        return False

class AnnotationGuideAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'task', 'project', 'is_public')
    search_fields = ('task__name', 'project__name')

    autocomplete_fields = ('task', 'project')

    def has_add_permission(self, request):
        return False

    inlines = [
        AssetInline
    ]

admin.site.register(Task, TaskAdmin)
admin.site.register(Segment, SegmentAdmin)
admin.site.register(Label, LabelAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Storage, StorageAdmin)
admin.site.register(CloudStorage, CloudStorageAdmin)
admin.site.register(Data, DataAdmin)
admin.site.register(AnnotationGuide, AnnotationGuideAdmin)
