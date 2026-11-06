from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0109_replica_job_type"),
    ]

    operations = [
        migrations.RenameField(
            model_name="task",
            old_name="consensus_replicas",
            new_name="initial_replicas",
        ),
        migrations.AlterField(
            model_name="task",
            name="initial_replicas",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
