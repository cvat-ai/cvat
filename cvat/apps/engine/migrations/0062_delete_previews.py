import os
import logging
import sys
import traceback

from django.db import migrations
from django.conf import settings

def delete_previews(apps, schema_editor):
    migration_name = os.path.splitext(os.path.basename(__file__))[0]
    migration_log_file = '{}.log'.format(migration_name)
    stdout = sys.stdout
    stderr = sys.stderr
    # redirect all stdout to the file
    log_file_object = open(os.path.join(settings.MIGRATIONS_LOGS_ROOT, migration_log_file), 'w')
    sys.stdout = log_file_object
    sys.stderr = log_file_object

    log = logging.getLogger(migration_name)
    log.addHandler(logging.StreamHandler(stdout))
    log.addHandler(logging.StreamHandler(log_file_object))
    log.setLevel(logging.INFO)

    def delete_object_previews(db_objects, root_path):
        for db_obj in db_objects:
            preview_path = os.path.join(root_path, str(db_obj.id), 'preview.jpeg')
            try:
                os.remove(preview_path)
            except Exception as e:
                log.error(f'Cannot delete path {preview_path}')
                log.error(str(e))
                traceback.print_exc(file=sys.stderr)

    log.info('\nDeleting Data previews...')
    Data = apps.get_model('engine', 'Data')
    delete_object_previews(Data.objects.all(), settings.MEDIA_DATA_ROOT)

    log.info('\nDeleting Job previews...')
    Job = apps.get_model('engine', 'Job')
    delete_object_previews(Job.objects.all(), settings.JOBS_ROOT)

    log.info('\nDeleting CloudStorage previews...')
    CloudStorage = apps.get_model('engine', 'CloudStorage')
    delete_object_previews(CloudStorage.objects.all(), settings.CLOUD_STORAGE_ROOT)

    log_file_object.close()
    sys.stdout = stdout
    sys.stderr = stderr

class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0061_auto_20221130_0844'),
    ]

    operations = [
        migrations.RunPython(
            code=delete_previews
        ),
    ]
