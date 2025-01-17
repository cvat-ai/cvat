import django.utils.timezone
from django.db import migrations, models

import cvat.apps.engine.models


def add_created_date_to_existing_jobs(apps, schema_editor):
    Job = apps.get_model("engine", "Job")

    jobs = Job.objects.prefetch_related('segment__task').all()
    for job in jobs:
        task = job.segment.task
        job.created_date = task.created_date

    Job.objects.bulk_update(jobs, fields=['created_date'], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0069_auto_20230608_1915'),
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
