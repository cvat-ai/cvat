# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.annotation import models
from django.conf import settings
from cvat.apps.annotation.serializers import AnnotationFormatSerializer

import os
from copy import deepcopy

def register_format(format_file):
    source_code = open(format_file, 'r').read()
    global_vars = {
        "__builtins__": {},
    }
    exec(source_code, global_vars)
    if "format_spec" not in global_vars or not isinstance(global_vars["format_spec"], dict):
        raise Exception("Could not find \'format_spec\' definition in format file specification")

    format_spec = deepcopy(global_vars["format_spec"])

    if not models.AnnotationFormat.objects.filter(name=format_spec["name"]).exists():
        format_spec["handler_file"] = os.path.relpath(format_file, settings.BASE_DIR)
        for spec in format_spec["loaders"] + format_spec["dumpers"]:
            spec["display_name"] = spec["display_name"].format(
                name=format_spec["name"],
                format=spec["format"],
                version=spec["version"],
                )

        serializer = AnnotationFormatSerializer(data=format_spec)
        if serializer.is_valid(raise_exception=True):
            serializer.save()

def get_annotation_formats():
    return AnnotationFormatSerializer(
        models.AnnotationFormat.objects.all(),
        many=True).data
