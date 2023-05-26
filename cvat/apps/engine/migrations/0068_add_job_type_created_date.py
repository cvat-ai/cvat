import cvat.apps.engine.models
from django.db import migrations, models
import django.utils.timezone


def add_created_date_to_existing_jobs(apps, schema_editor):
    Job = apps.get_model("engine", "Job")

    jobs = Job.objects.prefetch_related('segment__task').all()
    for job in jobs:
        task = job.segment.task
        job.created_date = task.created_date

    Job.objects.bulk_update(jobs, fields=['created_date'])


class Migration(migrations.Migration):

    replaces = [('engine', '0068_auto_20230406_1333'), ('engine', '0069_annotationconflict_annotationconflictsreport'), ('engine', '0070_alter_segment_frames'), ('engine', '0071_job_created_date'), ('engine', '0072_auto_20230422_1013'), ('engine', '0073_auto_20230426_1557'), ('engine', '0074_rename_frame_id_annotationconflict_frame'), ('engine', '0075_alter_annotationconflict_type'), ('engine', '0076_alter_annotationid_type'), ('engine', '0077_alter_annotationconflict_type'), ('engine', '0078_alter_annotationconflict_type'), ('engine', '0079_alter_annotationconflict_type'), ('engine', '0080_annotationconflict_importance'), ('engine', '0081_qualitysettings'), ('engine', '0082_alter_job_type'), ('engine', '0083_move_quality_models')]

    dependencies = [
        ('engine', '0067_alter_cloudstorage_credentials_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='type',
            field=models.CharField(choices=[('annotation', 'ANNOTATION'), ('ground_truth', 'GROUND_TRUTH')], default='annotation', max_length=32),
        ),
        migrations.AddField(
            model_name='segment',
            name='frames',
            field=cvat.apps.engine.models.IntArrayField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='segment',
            name='type',
            field=models.CharField(choices=[('range', 'RANGE'), ('specific_frames', 'SPECIFIC_FRAMES')], default='range', max_length=32),
        ),

        migrations.AddField(
            model_name='job',
            name='created_date',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, null=True),
            preserve_default=False,
        ),
        migrations.RunPython(
            code=add_created_date_to_existing_jobs,
        ),
        migrations.AlterField(
            model_name='job',
            name='created_date',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
