
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from enum import Enum

from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.storage import FileSystemStorage

fs = FileSystemStorage()

def upload_path_handler(instance, filename):
    return os.path.join(settings.MODELS_ROOT, str(instance.id), filename)

class FrameworkChoice(Enum):
    OPENVINO = 'openvino'
    TENSORFLOW = 'tensorflow'
    PYTORCH = 'pytorch'

    def __str__(self):
        return self.value


class SafeCharField(models.CharField):
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value:
            return value[:self.max_length]
        return value

class AnnotationModel(models.Model):
    name = SafeCharField(max_length=256)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    model_file = models.FileField(upload_to=upload_path_handler, storage=fs)
    weights_file = models.FileField(upload_to=upload_path_handler, storage=fs)
    labelmap_file = models.FileField(upload_to=upload_path_handler, storage=fs)
    interpretation_file = models.FileField(upload_to=upload_path_handler, storage=fs)
    shared = models.BooleanField(default=False)
    primary = models.BooleanField(default=False)
    framework = models.CharField(max_length=32, default=FrameworkChoice.OPENVINO)

    class Meta:
        default_permissions = ()

    def get_dirname(self):
        return "{models_root}/{id}".format(models_root=settings.MODELS_ROOT, id=self.id)

    def __str__(self):
        return self.name
