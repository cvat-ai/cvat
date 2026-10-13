from django.db import migrations


def init_settings_in_existing_tasks(apps, schema_editor):
    Task = apps.get_model("engine", "Task")
    ConsensusSettings = apps.get_model("consensus", "ConsensusSettings")

    tasks_without_settings = Task.objects.filter(consensus_settings__isnull=True).values_list(
        "id",
        flat=True,
    )

    ConsensusSettings.objects.bulk_create(
        [ConsensusSettings(task_id=tid) for tid in tasks_without_settings],
        batch_size=10000,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("consensus", "0002_remove_consensussettings_quorum"),
    ]

    operations = [
        migrations.RunPython(
            init_settings_in_existing_tasks,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
