# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os

from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage

from cvat.apps.engine.models import SafeCharField
from django.contrib.auth.models import User


def upload_file_handler(instance, filename):
    return os.path.join('formats', instance.id, filename)

class AnnotationFormat(models.Model):
    name = SafeCharField(max_length=256)
    format = SafeCharField(max_length=16)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    handler_file = models.FileField(
        upload_to=upload_file_handler,
        storage=FileSystemStorage(location=os.path.join(settings.BASE_DIR)),
    )
    version = SafeCharField(max_length=16)
    dump_specification = SafeCharField(max_length=256)
    parse_specification = SafeCharField(max_length=256)
    file_extension = SafeCharField(max_length=16)

    class Meta:
        default_permissions = ()
