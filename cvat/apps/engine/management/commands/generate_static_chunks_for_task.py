# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import shutil

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from cvat.apps.engine import models
from cvat.apps.engine.media_extractors import MEDIA_TYPES, VideoReader
from cvat.apps.engine.task import create_static_chunks


class Command(BaseCommand):
    help = "Switch a video task from cache to static cache, (re-)generate static chunks."

    def add_arguments(self, parser):
        parser.add_argument("task_id", type=int, help="ID of the task to convert")

    def _build_extractor(self, data: models.Data) -> VideoReader:
        details = {
            "source_path": [os.path.join(data.get_upload_dirname(), data.video.path)],
            "step": data.get_frame_step(),
            "start": data.start_frame,
            "stop": data.stop_frame,
        }
        return MEDIA_TYPES["video"]["extractor"](**details)

    @transaction.atomic
    def handle(self, *args, **opts):
        task_id: int = opts["task_id"]

        try:
            task: models.Task = models.Task.objects.select_for_update().get(pk=task_id)
        except models.Task.DoesNotExist:
            raise CommandError(f"Task #{task_id} does not exist")

        if not task.mode == "interpolation":
            raise CommandError(
                f"Task #{task_id} is not a video task (mode={task.mode}). Doing nothing."
            )

        data: models.Data = task.data

        extractor = self._build_extractor(data)

        data.storage_method = models.StorageMethodChoice.FILE_SYSTEM
        self._cleanup_static_cache(data)
        create_static_chunks(task, media_extractor=extractor, upload_dir=data.get_upload_dirname())

        self.stdout.write(f"Task #{task_id}: switched to static cache.")

    @staticmethod
    def _cleanup_static_cache(data: models.Data) -> None:
        for folder in (data.get_compressed_cache_dirname(), data.get_original_cache_dirname()):
            if os.path.exists(folder):
                try:
                    shutil.rmtree(folder)
                except Exception:
                    pass
            os.makedirs(folder)
