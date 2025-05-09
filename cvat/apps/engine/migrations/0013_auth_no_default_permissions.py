# Generated by Django 2.0.9 on 2018-11-07 12:25

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0012_auto_20181025_1618"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="attributespec",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="job",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="label",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="labeledboxattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="labeledpointsattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="labeledpolygonattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="labeledpolylineattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="objectpathattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="segment",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="task",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedbox",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedboxattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedpoints",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedpointsattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedpolygon",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedpolygonattributeval",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedpolyline",
            options={"default_permissions": ()},
        ),
        migrations.AlterModelOptions(
            name="trackedpolylineattributeval",
            options={"default_permissions": ()},
        ),
        migrations.RenameField(
            model_name="job",
            old_name="annotator",
            new_name="assignee",
        ),
        migrations.AddField(
            model_name="task",
            name="assignee",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assignees",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="task",
            name="owner",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owners",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="job",
            name="assignee",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="task",
            name="bug_tracker",
            field=models.CharField(blank=True, default="", max_length=2000),
        ),
        migrations.AlterField(
            model_name="task",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owners",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
