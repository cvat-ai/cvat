# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.project import Environment
from cvat.apps.engine.models import DimensionType


dm_env = Environment()

class _Format:
    NAME = ''
    EXT = ''
    VERSION = ''
    DISPLAY_NAME = '{NAME} {VERSION}'
    ENABLED = True

class Exporter(_Format):
    def __call__(self, dst_file, temp_dir, instance_data, **options):
        raise NotImplementedError()

class Importer(_Format):
    def __call__(self, src_file, temp_dir, instance_data, load_data_callback=None, **options):
        raise NotImplementedError()

def _wrap_format(f_or_cls, klass, name, version, ext, display_name, enabled, dimension=DimensionType.DIM_2D):
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
    target.DIMENSION = dimension
    target.ENABLED = enabled

    return target


EXPORT_FORMATS = {}


def format_for(export_format, mode):
    format_name = export_format
    if export_format not in EXPORT_FORMATS:
        if mode == "annotation":
            format_name = "CVAT for images 1.1"
        else:
            format_name = "CVAT for video 1.1"
    return format_name


def exporter(name, version, ext, display_name=None, enabled=True, dimension=DimensionType.DIM_2D):
    assert name not in EXPORT_FORMATS, "Export format '%s' already registered" % name
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Exporter,
            name=name, ext=ext, version=version, display_name=display_name,
            enabled=enabled, dimension=dimension)
        key = t.DISPLAY_NAME
        assert key not in EXPORT_FORMATS, "Export format '%s' already registered" % name
        EXPORT_FORMATS[key] = t
        return t
    return wrap_with_params

IMPORT_FORMATS = {}
def importer(name, version, ext, display_name=None, enabled=True, dimension=DimensionType.DIM_2D):
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Importer,
            name=name, ext=ext, version=version, display_name=display_name,
            enabled=enabled, dimension=dimension)
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
import cvat.apps.dataset_manager.formats.yolo
import cvat.apps.dataset_manager.formats.imagenet
import cvat.apps.dataset_manager.formats.camvid
import cvat.apps.dataset_manager.formats.widerface
import cvat.apps.dataset_manager.formats.vggface2
import cvat.apps.dataset_manager.formats.market1501
import cvat.apps.dataset_manager.formats.icdar
import cvat.apps.dataset_manager.formats.velodynepoint
import cvat.apps.dataset_manager.formats.pointcloud
import cvat.apps.dataset_manager.formats.kitti
import cvat.apps.dataset_manager.formats.lfw
import cvat.apps.dataset_manager.formats.cityscapes
import cvat.apps.dataset_manager.formats.openimages
