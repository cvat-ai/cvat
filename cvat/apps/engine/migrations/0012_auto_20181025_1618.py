# Generated by Django 2.0.9 on 2018-10-25 13:18
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0011_add_task_source_and_safecharfield"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="status",
            field=models.CharField(default="annotation", max_length=32),
        ),
        migrations.AlterField(
            model_name="task",
            name="status",
            field=models.CharField(default="annotation", max_length=32),
        ),
    ]
