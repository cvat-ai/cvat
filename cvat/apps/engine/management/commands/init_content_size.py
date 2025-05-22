# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import subprocess
from typing import Union

from django.core.management.base import BaseCommand

from cvat.apps.engine.models import Asset, Data
from cvat.apps.engine.utils import get_paths_sizes


class Command(BaseCommand):
    help = "The command initializes 'content_size' value for 'Data' and 'Asset' objects"

    def handle(self, *args, **options):
        batch_size = 1000
        for Model, get_directory_path, get_queryset in [
            (Asset, lambda asset: asset.get_asset_dir(), lambda: Asset.objects),
            (Data, lambda data: data.get_upload_dirname(), lambda: Data.objects.exclude(size=0)),
        ]:
            total = 0
            self.stdout.write(f"Started for {Model.__name__}")
            while True:
                try:
                    db_objects = list(get_queryset().filter(content_size=None).all()[:batch_size])
                    if not db_objects:
                        self.stdout.write(f"Finished for {Model.__name__}")
                        break
                    paths = [get_directory_path(db_object) for db_object in db_objects]
                    sizes = get_paths_sizes(paths)
                    for i, path in enumerate(paths):
                        if type(sizes[path]) is int:
                            db_objects[i].content_size = sizes[path]
                        else:
                            self.stderr.write(f"Failed to get size of {path}: {str(sizes[path])}")
                            db_objects[i].content_size = 0

                    Model.objects.bulk_update(db_objects, ["content_size"])
                    total += len(db_objects)
                    self.stdout.write(f"\tProcessed {total} objects")
                except Exception as ex:
                    self.stderr.write(f"Error occured during batch processing: {ex}")
                    break
