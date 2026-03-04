# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand, CommandError

from cvat.apps.engine.models import Task


class Command(BaseCommand):
    help = "Moves data of a given task from backing cloud storage back to the filesystem"

    def add_arguments(self, parser):
        parser.add_argument("task_id", type=int, help="ID of the task to move data of")

    def handle(self, *args, **options):
        task_id: int = options["task_id"]

        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            raise CommandError(f"Task #{task_id} does not exist")

        data = task.data
        if not data:
            raise CommandError(f"Task #{task_id} has no attached data")

        if not data.supports_backing_cs():
            raise CommandError(f"Task #{task_id} does not support backing cloud storage")

        if not data.local_storage_backing_cs_id:
            raise CommandError(f"Task #{task_id} has no backing cloud storage")

        data.move_from_backing_cs()
