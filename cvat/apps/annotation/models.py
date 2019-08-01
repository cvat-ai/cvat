# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from enum import Enum

from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage

from cvat.apps.engine.models import SafeCharField
from django.contrib.auth.models import User


def upload_file_handler(instance, filename):
    return os.path.join('formats', str(instance.id), filename)

class HandlerType(str, Enum):
    DUMPER = 'dumper'
    LOADER = 'loader'

    @classmethod
    def choices(self):
        return tuple((x.value, x.name) for x in self)

    def __str__(self):
        return self.value

class AnnotationFormat(models.Model):
    name = SafeCharField(max_length=256)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    handler_file = models.FileField(
        upload_to=upload_file_handler,
        storage=FileSystemStorage(location=os.path.join(settings.BASE_DIR)),
    )

    class Meta:
        default_permissions = ()

class AnnotationHandler(models.Model):
    type = models.CharField(max_length=16,
        choices=HandlerType.choices())
    display_name = SafeCharField(max_length=256, primary_key=True)
    format = models.CharField(max_length=16)
    version = models.CharField(max_length=16)
    handler = models.CharField(max_length=256)
    annotation_format = models.ForeignKey(AnnotationFormat, on_delete=models.CASCADE)

    class Meta:
        default_permissions = ()
