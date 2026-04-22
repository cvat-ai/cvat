# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand

from cvat.apps.engine.models import Task

from ..utils import move_multiple_tasks, parse_task_ids


class Command(BaseCommand):
    help = "Moves data of a given task from backing cloud storage back to the filesystem"

    def add_arguments(self, parser):
        parser.add_argument(
            "task_ids",
            type=parse_task_ids,
            help="ID of the task to move data of, or @<path> to a file with one ID per line",
        )

    def handle(self, *args, **options):
        task_ids: list[int] = options["task_ids"]

        move_multiple_tasks(self, task_ids, self._handle_one_task)

    def _handle_one_task(self, task: Task) -> bool:
        data = task.require_data()

        if not data.local_storage_backing_cs_id:
            self.stdout.write(
                self.style.WARNING(f"Task #{task.id} already has no backing cloud storage")
            )
            return False

        data.move_from_backing_cs()
        return True
