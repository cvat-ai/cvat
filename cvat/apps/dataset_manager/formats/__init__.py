
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.project import Environment

dm_env = Environment()


class _Format:
    NAME = ''
    EXT = ''
    VERSION = ''
    DISPLAY_NAME = '{name} {ext} {version}'

class Exporter(_Format):
    def __call__(self, dst_file, annotations, **options):
        raise NotImplementedError()

class Importer(_Format):
    def __call__(self, src_file, annotations, **options):
        raise NotImplementedError()

def _wrap_format(f_or_cls, klass, name, version, ext, display_name):
    import inspect
    if inspect.isclass(f):
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
        assert inspect.isclass(f_or_cls) or inspect.isfunction(f_or_cls)

    target.NAME = name or klass.NAME or f_or_cls.__name__
    target.VERSION = version or klass.VERSION
    target.EXT = ext or klass.EXT
    target.DISPLAY_NAME = (display_name or klass.DISPLAY_NAME).format(
        name=name, version=version, ext=ext)
    assert all([target.NAME, target.VERSION, target.EXT, target.DISPLAY_NAME])
    return target

EXPORT_FORMATS = {}
def exporter(name, ext, version, display_name=None):
    assert name not in EXPORT_FORMATS, "Export format '%s' already registered" % name
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Exporter,
            name=name, ext=ext, version=version, display_name=display_name)
        EXPORT_FORMATS[name] = t
        return t
    return wrap_with_params

IMPORT_FORMATS = {}
def importer(name, ext, version, display_name=None):
    assert name not in IMPORT_FORMATS, "Import format '%s' already registered" % name
    def wrap_with_params(f_or_cls):
        t = _wrap_format(f_or_cls, Importer,
            name=name, ext=ext, version=version, display_name=display_name)
        IMPORT_FORMATS[name] = t
        return t
    return wrap_with_params


def _serialize_format(f):
    return {
        'name': f.DISPLAY_NAME,
        'tag': f.NAME,
        'ext': f.EXT,
        'version': f.VERSION,
    }

def get_export_formats():
    return [_serialize_format(f) for f in EXPORT_FORMATS]

def get_import_formats():
    return [_serialize_format(f) for f in IMPORT_FORMATS]
