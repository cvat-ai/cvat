import os
import mimetypes
_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))
_MEDIA_MIMETYPES_FILE = os.path.join(_SCRIPT_DIR, "media.mimetypes")
mimetypes.init(files=[_MEDIA_MIMETYPES_FILE])

def is_archive(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/zip', 'application/x-rar-compressed',
        'application/x-tar', 'application/x-7z-compressed', 'application/x-cpio',
        'gzip', 'bzip2']
    return mime_type in supportedArchives or encoding in supportedArchives

def is_video(path):
    mime = mimetypes.guess_type(path)
    return mime[0] is not None and mime[0].startswith('video')

def is_image(path):
    mime = mimetypes.guess_type(path)
    return mime[0] is not None and mime[0].startswith('image')

def is_dir(path):
    return os.path.isdir(path)

def get_mime(name):
    from cvat.apps.engine.settings import MEDIA_TYPES
    for type_name, type_def in MEDIA_TYPES.items():
        if type_def['has_mime_type'](name):
            return type_name

    return 'unknown'
