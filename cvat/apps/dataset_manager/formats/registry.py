
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.project import Environment


dm_env = Environment()

class _Format:
    NAME = ''
    EXT = ''
    VERSION = ''
    DISPLAY_NAME = '{NAME} {VERSION}'
    ENABLED = True

class Exporter(_Format):
    def __call__(self, dst_file, task_data, **options):
        raise NotImplementedError()

class Importer(_Format):
    def __call__(self, src_file, task_data, **options):
        raise NotImplementedError()

def _wrap_format(f_or_cls, klass, name, version, ext, display_name, enabled):
    import inspect
    assert inspect.isclass(f_or_cls) or inspect.isfunction(f_or_cls)
    if inspect.isclass(f_or_cls):
        assert hasattr(f_or_cls, '__call__')
        target = f_or_cls
    elif inspect.isfunction(f_or_cls):
        class wrapper(klass):
            # pylint: disable=arguments-differ
            def __call__(self, *args, **kwargs):
                f_or_cls(*args, **kwargs)

        wrapper.__name__ = f_or_cls.__name__
        wrapper.__module__ = f_or_cls.__module__
        target = wrapper

    target.NAME = name or klass.NAME or f_or_cls.__name__
    target.VERSION = version or klass.VERSION
    target.EXT = ext or klass.EXT
    target.DISPLAY_NAME = (display_name or klass.DISPLAY_NAME).format(
        NAME=name, VERSION=version, EXT=ext)
    assert all([target.NAME, target.VERSION, target.EXT, target.DISPLAY_NAME])
    target.ENABLED = enabled

    return target

EXPORT_FORMATS = {}
def exporter(name, version, ext, display_name=None, enabled=True):
    assert name not in EXPORT_FORMATS, "Export format '%s' already registered" % name
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Exporter,
            name=name, ext=ext, version=version, display_name=display_name,
            enabled=enabled)
        key = t.DISPLAY_NAME
        assert key not in EXPORT_FORMATS, "Export format '%s' already registered" % name
        EXPORT_FORMATS[key] = t
        return t
    return wrap_with_params

IMPORT_FORMATS = {}
def importer(name, version, ext, display_name=None, enabled=True):
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Importer,
            name=name, ext=ext, version=version, display_name=display_name,
            enabled=enabled)
        key = t.DISPLAY_NAME
        assert key not in IMPORT_FORMATS, "Import format '%s' already registered" % name
        IMPORT_FORMATS[key] = t
        return t
    return wrap_with_params

def make_importer(name):
    return IMPORT_FORMATS[name]()

def make_exporter(name):
    return EXPORT_FORMATS[name]()

# pylint: disable=unused-import
import cvat.apps.dataset_manager.formats.coco
import cvat.apps.dataset_manager.formats.cvat
import cvat.apps.dataset_manager.formats.datumaro
import cvat.apps.dataset_manager.formats.labelme
import cvat.apps.dataset_manager.formats.mask
import cvat.apps.dataset_manager.formats.mot
import cvat.apps.dataset_manager.formats.mots
import cvat.apps.dataset_manager.formats.pascal_voc
import cvat.apps.dataset_manager.formats.tfrecord
import cvat.apps.dataset_manager.formats.yolo
import cvat.apps.dataset_manager.formats.imagenet