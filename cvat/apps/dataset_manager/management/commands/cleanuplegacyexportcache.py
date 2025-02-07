# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import shutil
from contextlib import suppress
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone

from cvat.apps.engine.models import Job, Project, Task


class Command(BaseCommand):
    help = "Cleanup outdated export cache"

    def handle(self, *args, **options):
        def update_progress():
            progress = (i + 1) / objects_count
            done = int(progress_bar_len * progress)
            progress_bar = "#" * done + "-" * (progress_bar_len - done)
            self.stdout.write(f"\rProgress: |{progress_bar}| {progress:.0%}", ending="")

        now = timezone.now()
        progress_bar_len = shutil.get_terminal_size().columns // 2

        for Model in (Project, Task, Job):
            self.stdout.write(f"\nDeleting the export cache for {Model.__name__.lower()}s...")
            queryset = Model.objects.filter(created_date__lt=now)
            objects_count = queryset.count()
            if objects_count < 1:
                continue

            msg = (
                f"{objects_count} folders are going to be checked"
                if objects_count > 1
                else "1 folder is going to be checked"
            )
            self.stdout.write(msg)

            for i, obj in enumerate(queryset.iterator()):
                update_progress()
                export_cache_dir = Path(obj.get_dirname()) / "export_cache"
                with suppress(FileNotFoundError):
                    shutil.rmtree(export_cache_dir)
