from __future__ import annotations

import argparse
import os
import shutil
from unittest.mock import Mock, PropertyMock, patch

import django
from django.db import connection, transaction
from django.db.migrations.recorder import MigrationRecorder
from tqdm import tqdm

django.setup()

from cvat.apps.engine import models
from cvat.apps.engine.media_extractors import MEDIA_TYPES
from cvat.apps.engine.task import _create_static_chunks

EXPECTED_LAST_ENGINE_MIGRATION = "0095_fix_related_names"


def _ensure_last_engine_applied_migration_name():
    recorder = MigrationRecorder(connection)
    app_name = "engine"
    applied_migrations_names = list(
        recorder.Migration.objects.filter(app=app_name).values_list("name", flat=True)
    )
    assert applied_migrations_names, f"No migrations applied for app '{app_name}'"

    highest_by_number = max(applied_migrations_names, key=lambda name: int(name.split("_")[0]))

    assert highest_by_number == EXPECTED_LAST_ENGINE_MIGRATION, (
        f"Last applied migration for app '{app_name}' is '{highest_by_number}', "
        f"expected '{EXPECTED_LAST_ENGINE_MIGRATION}'. "
        f"Manually verify that the script still works correctly "
        f"and update EXPECTED_ENGINE_LAST_ENGINE_MIGRATION var in the script."
    )


def _build_extractor(data: models.Data):
    details = {
        "source_path": [os.path.join(data.get_upload_dirname(), data.video.path)],
        "step": data.get_frame_step(),
        "start": data.start_frame,
        "stop": data.stop_frame,
    }
    return MEDIA_TYPES["video"]["extractor"](**details)


def _cleanup_static_cache(data: models.Data):
    for folder in (data.get_compressed_cache_dirname(), data.get_original_cache_dirname()):
        if os.path.exists(folder):
            shutil.rmtree(folder)
        os.makedirs(folder)


def main():
    parser = argparse.ArgumentParser(
        description="Switch a video task to static cache storage and generate static chunks."
    )
    parser.add_argument("task_id", type=int, help="Task ID (integer)")
    args = parser.parse_args()
    task_id = args.task_id

    _ensure_last_engine_applied_migration_name()

    with transaction.atomic():
        try:
            task: models.Task = models.Task.objects.select_for_update().get(pk=task_id)
        except models.Task.DoesNotExist as ex:
            raise ValueError(f"Task #{task_id} not found.") from ex

        assert (
            task.mode == "interpolation"
        ), f"Task #{task_id} is not a video task (mode={task.mode})."

        data: models.Data = task.data

        extractor = _build_extractor(data)

        data.storage_method = models.StorageMethodChoice.FILE_SYSTEM
        _cleanup_static_cache(data)

        with tqdm(total=1.0, bar_format="{l_bar}{bar}| {n:.2f}/{total:.2f}") as pbar:

            class _PropertyMock(PropertyMock):
                def __set__(self, instance, value):
                    pbar.n = value
                    pbar.refresh()

            with patch("cvat.apps.engine.task.ImportRQMeta", return_value=Mock()) as mock:
                type(mock.for_job.return_value).task_progress = _PropertyMock()
                _create_static_chunks(
                    task, media_extractor=extractor, upload_dir=data.get_upload_dirname()
                )
                data.save(update_fields=["storage_method"])

    print(f"Task #{task_id}: switched to static cache.")


if __name__ == "__main__":
    main()
