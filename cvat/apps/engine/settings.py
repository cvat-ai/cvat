import os
from cvat.apps.engine.mime import is_image, is_video, is_archive, is_dir
from cvat.apps.engine.media_extractors import ImageListExtractor, DirectoryExtractor, \
    VideoExtractor, ArchiveExtractor

MEDIA_TYPES = {
    'image': {
        'has_mime_type': is_image,
        'extractor': ImageListExtractor,
    },
    'video': {
        'has_mime_type': is_video,
        'extractor': VideoExtractor,
    },
    'archive': {
        'has_mime_type': is_archive,
        'extractor': ArchiveExtractor,
    },
    'directory': {
        'has_mime_type': is_dir,
        'extractor': DirectoryExtractor,
    },
}
