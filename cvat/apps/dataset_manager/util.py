
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import inspect
import os, os.path as osp
import zipfile
from django.conf import settings


def current_function_name(depth=1):
    return inspect.getouterframes(inspect.currentframe())[depth].function


def _archive(src_path, dst_path, mode='w'):
    if osp.isfile(src_path):
        with zipfile.ZipFile(dst_path, mode) as archive:
            archive.write(src_path, osp.basename(src_path))
    elif osp.isdir(src_path):
        with zipfile.ZipFile(dst_path, mode) as archive:
            for (dirpath, _, filenames) in os.walk(src_path):
                for name in filenames:
                    path = osp.join(dirpath, name)
                    archive.write(path, osp.relpath(path, src_path))
    else:
        raise ValueError('Unsupported path')


def make_zip_archive(src_path, dst_path):
    _archive(src_path, dst_path, 'w')


def add_to_archive(src_path, dst_path):
    _archive(src_path, dst_path, 'a')


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