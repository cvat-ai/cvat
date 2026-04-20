# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand, CommandError

from cvat.apps.engine.models import CloudStorage, Task

from ..utils import move_multiple_tasks, parse_task_ids


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

        move_multiple_tasks(self, task_ids, lambda task: self._handle_one_task(task, backing_cs))

    def _handle_one_task(self, task: Task, backing_cs: CloudStorage) -> bool:
        data = task.require_data()

        if not data.supports_backing_cs():
            raise CommandError(f"Task #{task.id} does not support backing cloud storage")

        if data.local_storage_backing_cs_id == backing_cs.id:
            self.stdout.write(
                self.style.WARNING(
                    f"Task #{task.id} is already backed by cloud storage #{backing_cs.id}"
                )
            )
            return False

        if data.local_storage_backing_cs_id:
            raise CommandError(
                f"Task #{task.id} already has a backing cloud storage"
                f" (#{data.local_storage_backing_cs_id})"
            )

        data.move_to_backing_cs(backing_cs)
        return True
