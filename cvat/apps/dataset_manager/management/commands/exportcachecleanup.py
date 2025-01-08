# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import shutil
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
            print(f"\rProgress: |{progress_bar}| {progress:.0%}", end="", flush=True)

        now = timezone.now()
        progress_bar_len = os.get_terminal_size().columns // 2

        for Model in (Project, Task, Job):
            print(f"\nDeleting the export cache for {Model.__name__.lower()}s...")
            queryset = Model.objects.filter(created_date__lt=now)
            objects_count = queryset.count()
            if objects_count < 1:
                continue

            msg = (
                f"\nThe {objects_count} folders are going to be checked"
                if objects_count > 1
                else "\nThe 1 folder is going to be checked"
            )
            print(msg)

            for i, obj in enumerate(queryset.iterator()):
                update_progress()
                export_cache_dir = Path(obj.get_dirname()) / "export_cache"
                if export_cache_dir.exists():
                    shutil.rmtree(export_cache_dir)
