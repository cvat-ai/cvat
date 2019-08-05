# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.contrib.auth.models import User

from cvat.apps.engine.models import SafeCharField

def upload_file_handler(instance, filename):
    return os.path.join('formats', str(instance.id), filename)

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
    display_name = SafeCharField(max_length=256, primary_key=True)
    format = models.CharField(max_length=16)
    version = models.CharField(max_length=16)
    handler = models.CharField(max_length=256)
    annotation_format = models.ForeignKey(AnnotationFormat, on_delete=models.CASCADE)

    class Meta:
        default_permissions = ()
        abstract = True

class AnnotationDumper(AnnotationHandler):
    pass

class AnnotationLoader(AnnotationHandler):
    pass
