import os
import mimetypes
from cvat.apps.engine.media_extractors import ImageListExtractor, DirectoryExtractor, \
    VideoExtractor, ArchiveExtractor
_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))

MEDIA_MIMETYPES_FILES = [
    os.path.join(_SCRIPT_DIR, "media.mimetypes"),
]

mimetypes.init(files=MEDIA_MIMETYPES_FILES)

def _is_archive(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/zip', 'application/x-rar-compressed',
        'application/x-tar', 'application/x-7z-compressed', 'application/x-cpio',
        'gzip', 'bzip2']
    return mime_type in supportedArchives or encoding in supportedArchives

def _is_video(path):
    mime = mimetypes.guess_type(path)
    return mime[0] is not None and mime[0].startswith('video')

def _is_image(path):
    mime = mimetypes.guess_type(path)
    return mime[0] is not None and mime[0].startswith('image')

def _is_dir(path):
    return os.path.isdir(path)

MEDIA_TYPES = {
    'image': {
        'has_mime_type': _is_image,
        'extractor': ImageListExtractor,
        'mode': 'annotation',
    },
    'video': {
        'has_mime_type': _is_video,
        'extractor': VideoExtractor,
        'mode': 'interpolation',
    },
    'archive': {
        'has_mime_type': _is_archive,
        'extractor': ArchiveExtractor,
        'mode': 'annotation',
    },
    'directory': {
        'has_mime_type': _is_dir,
        'extractor': DirectoryExtractor,
        'mode': 'annotation',
    },
}

def _get_mime(name):
    for type_name, type_def in MEDIA_TYPES.items():
        if type_def['has_mime_type'](name):
            return type_name

    return 'unknown'
