# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage

from cvat.apps.engine.models import SafeCharField
from django.contrib.auth.models import User


def upload_dumper_handler(instance, filename):
    return os.path.join('user', 'dumpers', instance.id, filename)

def upload_parser_handler(instance, filename):
    return os.path.join('user', 'parsers', instance.id, filename)

class AnnotationHandler(models.Model):
    name = SafeCharField(max_length=256)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    extension = models.CharField(max_length=32)
    display_name = SafeCharField(max_length=256)

    class Meta:
        abstract = True
        default_permissions = ()

class AnnotationDumper(AnnotationHandler):
    handler_file = models.FileField(
        upload_to=upload_dumper_handler,
        storage=FileSystemStorage(location=os.path.join(settings.BASE_DIR)),
    )

class AnnotationParser(AnnotationHandler):
    handler_file = models.FileField(
        upload_to=upload_parser_handler,
        storage=FileSystemStorage(location=os.path.join(settings.BASE_DIR)),
    )
