from django.db import migrations

def set_default_export_limits(apps, schema_editor):
    Limitation = apps.get_model('limit_manager', 'Limitation')

    for limitation in Limitation.objects.all():
        if limitation.type == "default":
            limitation.job_export_dataset = 0
            limitation.task_export_dataset = 0
            limitation.project_export_dataset = 0
            limitation.save()


class Migration(migrations.Migration):

    dependencies = [
        ('limit_manager', '0006_auto_20230120_1548'),
    ]

    operations = [
        migrations.RunPython(set_default_export_limits)
    ]
