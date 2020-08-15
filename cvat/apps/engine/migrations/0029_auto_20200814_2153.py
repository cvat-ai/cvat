from django.db import migrations
from django.conf import settings
import os
from cvat.apps.engine.mime_types import mimetypes
from pyunpack import Archive

def unzip(apps, schema_editor):
    Data = apps.get_model("engine", "Data")
    data_q_set = Data.objects.all()
    archive_paths = []
    archive_mimes = [
        'application/gzip',
        'application/rar'
        'application/x-7z-compressed',
        'application/x-bzip',
        'application/x-bzip-compressed-tar',
        'application/x-compress',
        'application/x-compressed-tar',
        'application/x-cpio',
        'application/x-gtar-compressed',
        'application/x-lha',
        'application/x-lhz',
        'application/x-lrzip-compressed-tar',
        'application/x-lz4',
        'application/x-lzip',
        'application/x-lzip-compressed-tar',
        'application/x-lzma',
        'application/x-lzma-compressed-tar',
        'application/x-lzop',
        'application/x-tar',
        'application/x-tarz',
        'application/x-tzo',
        'application/x-xz-compressed-tar',
        'application/zip',
    ]

    for data_instance in data_q_set:
        for root, _, files in os.walk(os.path.join(settings.MEDIA_DATA_ROOT, '{}/raw/'.format(data_instance.id))):
            archive_paths.extend([os.path.join(root, file) for file in files if mimetypes.guess_type(file)[0] in archive_mimes])

    for path in archive_paths:
        Archive(path).extractall(os.path.dirname(path))
        os.remove(path)

class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0028_data_storage_method'),
    ]

    operations = [
        migrations.RunPython(unzip)
    ]