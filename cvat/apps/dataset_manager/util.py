
# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy
from typing import Sequence
import inspect
import os, os.path as osp
import zipfile

from django.conf import settings
from django.db.models import QuerySet


def current_function_name(depth=1):
    return inspect.getouterframes(inspect.currentframe())[depth].function


def make_zip_archive(src_path, dst_path):
    with zipfile.ZipFile(dst_path, 'w') as archive:
        for (dirpath, _, filenames) in os.walk(src_path):
            for name in filenames:
                path = osp.join(dirpath, name)
                archive.write(path, osp.relpath(path, src_path))


def bulk_create(db_model, objects, flt_param):
    if objects:
        if flt_param:
            if 'postgresql' in settings.DATABASES["default"]["ENGINE"]:
                return db_model.objects.bulk_create(objects)
            else:
                ids = list(db_model.objects.filter(**flt_param).values_list('id', flat=True))
                db_model.objects.bulk_create(objects)

                return list(db_model.objects.exclude(id__in=ids).filter(**flt_param))
        else:
            return db_model.objects.bulk_create(objects)

    return []

def is_prefetched(queryset: QuerySet, field: str) -> bool:
    return field in queryset._prefetch_related_lookups

def add_prefetch_fields(queryset: QuerySet, fields: Sequence[str]) -> QuerySet:
    for field in fields:
        if not is_prefetched(queryset, field):
            queryset = queryset.prefetch_related(field)

    return queryset

def deepcopy_simple(v):
    # Default deepcopy is very slow

    if isinstance(v, dict):
        return {k: deepcopy_simple(vv) for k, vv in v.items()}
    elif isinstance(v, (list, tuple, set)):
        return type(v)(deepcopy_simple(vv) for vv in v)
    elif isinstance(v, (int, float, str, bool)) or v is None:
        return v
    else:
        return deepcopy(v)
