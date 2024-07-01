# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any, ClassVar, Optional, Sequence, Type, Union

import datumaro as dm

from cvat.apps.engine.models import DimensionType, LabelType


dm_env = dm.Environment()

class _Format:
    NAME: ClassVar[str] = ''
    EXT: ClassVar[str] = ''
    VERSION: ClassVar[str] = ''
    DISPLAY_NAME: ClassVar[str] = '{NAME} {VERSION}'
    SUPPORTED_ANNOTATION_TYPES: ClassVar[Union[LabelType, Sequence[LabelType]]] = LabelType.ANY
    ENABLED: ClassVar[bool] = True

class Exporter(_Format):
    def __call__(self, dst_file, temp_dir, instance_data, **options):
        raise NotImplementedError()

class Importer(_Format):
    def __call__(self, src_file, temp_dir, instance_data, load_data_callback=None, **options):
        raise NotImplementedError()

def _wrap_format(
    f_or_cls,
    klass: Union[Type[Exporter], Type[Importer]],
    name: str,
    version: str,
    ext: str,
    display_name: Optional[str] = None,
    enabled: bool = True,
    dimension: DimensionType = DimensionType.DIM_2D,
    supported_annotation_types: Union[LabelType, Sequence[LabelType]] = LabelType.ANY,
) -> Union[Importer, Exporter]:
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
    else:
        assert False

    def _maybe_set(target: Type, attr: str, value: Any):
        if not hasattr(target, attr) or getattr(target, attr) == getattr(klass, attr):
            setattr(target, attr, value)

    _maybe_set(target, 'NAME', name or klass.NAME or f_or_cls.__name__)
    _maybe_set(target, 'VERSION', version or klass.VERSION)
    _maybe_set(target, 'EXT', ext or klass.EXT)
    _maybe_set(target, 'DISPLAY_NAME', (display_name or klass.DISPLAY_NAME).format(
        NAME=name, VERSION=version, EXT=ext
    ))
    _maybe_set(target, 'DIMENSION', dimension)
    _maybe_set(target, 'SUPPORTED_ANNOTATION_TYPES', supported_annotation_types or LabelType.ANY)
    _maybe_set(target, 'ENABLED', enabled)
    assert all([
        target.NAME, target.VERSION, target.EXT, target.DISPLAY_NAME,
        target.SUPPORTED_ANNOTATION_TYPES
    ])

    return target


EXPORT_FORMATS = {}
IMPORT_FORMATS = {}


def format_for(export_format: str, mode: str) -> str:
    format_name = export_format
    if export_format not in EXPORT_FORMATS:
        if mode == "annotation":
            format_name = "CVAT for images 1.1"
        else:
            format_name = "CVAT for video 1.1"
    return format_name


def exporter(
    name: str,
    version: str,
    ext: str,
    display_name: Optional[str] = None,
    enabled: bool = True,
    dimension: DimensionType = DimensionType.DIM_2D,
    supported_annotation_types: Union[LabelType, Sequence[LabelType]] = LabelType.ANY,
):
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Exporter,
            name=name, ext=ext, version=version, display_name=display_name,
            enabled=enabled, dimension=dimension,
            supported_annotation_types=supported_annotation_types)
        key = t.DISPLAY_NAME
        assert key not in EXPORT_FORMATS, "Export format '%s' already registered" % name
        EXPORT_FORMATS[key] = t
        return t
    return wrap_with_params

def importer(
    name: str,
    version: str,
    ext: str,
    display_name: Optional[str] = None,
    enabled: bool = True,
    dimension: DimensionType = DimensionType.DIM_2D,
    supported_ann_types: Union[LabelType, Sequence[LabelType]] = LabelType.ANY,
):
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Importer,
            name=name, ext=ext, version=version, display_name=display_name,
            enabled=enabled, dimension=dimension,
            supported_annotation_types=supported_ann_types)
        key = t.DISPLAY_NAME
        assert key not in IMPORT_FORMATS, "Import format '%s' already registered" % name
        IMPORT_FORMATS[key] = t
        return t
    return wrap_with_params

def make_importer(name: str) -> Importer:
    return IMPORT_FORMATS[name]()

def make_exporter(name: str) -> Exporter:
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
