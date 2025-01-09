import os

from django.db import migrations

from cvat.apps.engine.log import get_migration_logger


def delete_or_rename_wrong_labels(apps, schema_editor):
    migration_name = os.path.splitext(os.path.basename(__file__))[0]
    with get_migration_logger(migration_name) as log:
        log.info('\nDeleting skeleton Labels without skeletons...')

        Label = apps.get_model('engine', 'Label')
        for label in Label.objects.all():
            if label.type == "skeleton" and not hasattr(label, "skeleton"):
                label.delete()

        log.info('\nDeleting duplicate skeleton sublabels and renaming duplicate Labels...')
        for name, parent, project, task in Label.objects.values_list("name", "parent", "project", "task").distinct():
            duplicate_labels = Label.objects.filter(name=name, parent=parent, project=project)
            if task is not None:
                duplicate_labels = Label.objects.filter(name=name, parent=parent, task=task)

            if len(duplicate_labels) > 1:
                label = duplicate_labels[0]
                if label.parent is not None:
                    label.delete()
                else:
                    for i, label in enumerate(duplicate_labels[1:]):
                        label.name = f"{label.name}_duplicate_{i + 1}"
                        label.save()

class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0063_delete_jobcommit'),
    ]

    operations = [
        migrations.RunPython(
            code=delete_or_rename_wrong_labels
        ),
    ]
