# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.apps import AppConfig
from django.db.models.signals import post_migrate
from cvat.apps.annotation.settings import BUILTIN_FORMATS

def register_builtins_callback(sender, **kwargs):
    from .format import register_format
    for builtin_format in BUILTIN_FORMATS:
        register_format(builtin_format)

class AnnotationConfig(AppConfig):
    name = 'cvat.apps.annotation'

    def ready(self):
        post_migrate.connect(register_builtins_callback, sender=self)
