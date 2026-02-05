# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand, CommandError

from cvat.apps.engine.models import Task


class Command(BaseCommand):
    help = "Moves data of a given task to a backing cloud storage"

    def add_arguments(self, parser):
        parser.add_argument("task_id", type=int, help="ID of the task to move data of")
        parser.add_argument(
            "backing_cs_id",
            type=int,
            help="ID of the backing cloud storage to move data to",
        )

    def handle(self, *args, **options):
        task_id: int = options["task_id"]
        backing_cs_id: int = options["backing_cs_id"]

        task = Task.objects.get(id=task_id)
        data = task.require_data()

        if not data.supports_backing_cs():
            raise CommandError(f"Task #{task_id} does not support backing cloud storage")

        if data.local_storage_backing_cs_id:
            raise CommandError(
                f"Task #{task_id} already has a backing cloud storage"
                f" (#{data.local_storage_backing_cs_id})"
            )

        data.move_to_backing_cs(backing_cs_id)
