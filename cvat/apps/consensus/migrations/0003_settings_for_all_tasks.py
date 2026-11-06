from collections.abc import Generator, Iterable
from itertools import islice
from typing import TypeVar

from django.db import migrations

_T = TypeVar("_T")


def take_by(iterable: Iterable[_T], chunk_size: int) -> Generator[list[_T], None, None]:
    """
    Returns elements from the input iterable by batches of N items.
    ('abcdefg', 3) -> ['a', 'b', 'c'], ['d', 'e', 'f'], ['g']
    """

    it = iter(iterable)
    while True:
        batch = list(islice(it, chunk_size))
        if len(batch) == 0:
            break

        yield batch


def init_settings_in_existing_tasks(apps, schema_editor):
    Task = apps.get_model("engine", "Task")
    ConsensusSettings = apps.get_model("consensus", "ConsensusSettings")

    batch_size = 5000
    task_ids = (
        Task.objects.filter(consensus_settings__isnull=True)
        .values_list("id", flat=True)
        .iterator(chunk_size=batch_size)
    )

    for task_ids_batch in take_by(task_ids, chunk_size=batch_size):
        ConsensusSettings.objects.bulk_create(
            [ConsensusSettings(task_id=task_id) for task_id in task_ids_batch]
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
