from django.conf import settings
from django.db import migrations, models
from django.db.models import Count


def _build_unique_task_name(existing_names: set[str], original_name: str, task_id: int, max_length: int) -> str:
    suffix = f" ({task_id})"
    trimmed_name = original_name[: max_length - len(suffix)]
    candidate = f"{trimmed_name}{suffix}"

    attempt = 1
    while candidate in existing_names:
        attempt_suffix = f" ({task_id}-{attempt})"
        trimmed_name = original_name[: max_length - len(attempt_suffix)]
        candidate = f"{trimmed_name}{attempt_suffix}"
        attempt += 1

    return candidate


def deduplicate_task_names(apps, schema_editor):
    Task = apps.get_model("engine", "Task")
    max_length = Task._meta.get_field("name").max_length

    duplicate_names = list(
        Task.objects.values("name")
        .annotate(name_count=Count("id"))
        .filter(name_count__gt=1)
        .values_list("name", flat=True)
    )

    if not duplicate_names:
        return

    existing_names = set(Task.objects.values_list("name", flat=True))

    for duplicated_name in duplicate_names:
        tasks = list(Task.objects.filter(name=duplicated_name).order_by("id"))
        for task in tasks[1:]:
            existing_names.discard(task.name)
            new_name = _build_unique_task_name(existing_names, duplicated_name, task.id, max_length)
            print(f"[0107_task_unique_task_name] Renaming task {task.id}: {task.name!r} -> {new_name!r}")
            task.name = new_name
            task.save(update_fields=["name"])
            existing_names.add(task.name)


class Migration(migrations.Migration):

    dependencies = [
        ("engine", "0106_add_interval_annotations"),
        ("organizations", "0002_invitation_sent_date"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(deduplicate_task_names, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="task",
            constraint=models.UniqueConstraint(
                fields=("name",),
                name="unique_task_name",
                violation_error_message="A task with this name already exists.",
            ),
        ),
    ]
