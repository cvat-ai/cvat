# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import traceback

from django.core.management.base import BaseCommand, CommandError

from cvat.apps.engine.models import CloudStorage, Task
from ..utils import parse_task_ids


class Command(BaseCommand):
    help = "Moves data of a given task to a backing cloud storage"

    def add_arguments(self, parser):
        parser.add_argument(
            "task_ids",
            type=parse_task_ids,
            help="ID of the task to move data of, or @<path> to a file with one ID per line",
        )
        parser.add_argument(
            "backing_cs_id",
            type=int,
            help="ID of the backing cloud storage to move data to",
        )

    def handle(self, *args, **options):
        task_ids: list[int] = options["task_ids"]
        backing_cs_id: int = options["backing_cs_id"]

        try:
            backing_cs = CloudStorage.objects.get(id=backing_cs_id)
        except CloudStorage.DoesNotExist:
            raise CommandError(f"Cloud storage #{backing_cs_id} does not exist")

        succeeded = failed = 0

        for task_id in task_ids:
            try:
                self._handle_one_task(task_id, backing_cs)
            except Exception:
                failed += 1
                self.stderr.write(self.style.ERROR(f"Task #{task_id}: failure"))
                self.stderr.write(traceback.format_exc(), ending="")
            else:
                succeeded += 1
                self.stdout.write(self.style.SUCCESS(f"Task #{task_id}: success"))

        self.stdout.write(
            f"Processed {len(task_ids)} task(s): {succeeded} succeeded, {failed} failed"
        )

        if failed:
            raise CommandError(f"Failed to move some task(s)")

    def _handle_one_task(self, task_id: int, backing_cs: CloudStorage) -> None:
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist as ex:
            raise CommandError(f"Task #{task_id} does not exist") from ex

        data = task.data
        if not data:
            raise CommandError(f"Task #{task_id} has no attached data")

        if not data.supports_backing_cs():
            raise CommandError(f"Task #{task_id} does not support backing cloud storage")

        if data.local_storage_backing_cs_id:
            raise CommandError(
                f"Task #{task_id} already has a backing cloud storage"
                f" (#{data.local_storage_backing_cs_id})"
            )

        data.move_to_backing_cs(backing_cs)
