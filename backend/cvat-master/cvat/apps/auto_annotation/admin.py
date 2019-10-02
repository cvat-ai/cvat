
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib import admin
from .models import AnnotationModel

@admin.register(AnnotationModel)
class AnnotationModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_date', 'updated_date',
        'shared', 'primary', 'framework')

    def has_add_permission(self, request):
        return False
