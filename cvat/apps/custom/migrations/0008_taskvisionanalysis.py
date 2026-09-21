from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0093_issue_assignee_updated_date_alter_issue_assignee_and_more"),
        ("custom", "0007_user_admin_audit"),
    ]

    operations = [
        migrations.CreateModel(
            name="TaskVisionAnalysis",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("chapters", models.JSONField(help_text="Chapters document, schema_version 1")),
                ("car_count", models.PositiveIntegerField(blank=True, null=True)),
                ("needs_review", models.BooleanField(db_index=True, default=False)),
                ("truncated_start", models.BooleanField(blank=True, null=True)),
                ("truncated_end", models.BooleanField(blank=True, null=True)),
                ("trimmed", models.BooleanField(default=False)),
                ("trim_ratio", models.FloatField(blank=True, null=True)),
                ("video_duration_s", models.FloatField(blank=True, null=True)),
                ("analysed_camera", models.CharField(blank=True, default="", max_length=16)),
                ("outcome", models.CharField(blank=True, default="", max_length=40)),
                ("pipeline_image", models.CharField(blank=True, max_length=120, null=True)),
                ("created_date", models.DateTimeField(auto_now_add=True)),
                ("updated_date", models.DateTimeField(auto_now=True)),
                ("task", models.OneToOneField(help_text="Associated CVAT task", on_delete=django.db.models.deletion.CASCADE, related_name="vision_analysis", to="engine.task")),
            ],
            options={
                "verbose_name": "Task Vision Analysis",
                "verbose_name_plural": "Task Vision Analyses",
                "db_table": "custom_task_vision_analysis",
            },
        ),
    ]
