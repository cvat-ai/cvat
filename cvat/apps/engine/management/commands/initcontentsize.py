# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand

from cvat.apps.engine.models import Asset, Data
from cvat.apps.engine.utils import get_path_size, take_by


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
            for db_objects in take_by(
                get_queryset().filter(content_size=None).iterator(), batch_size
            ):
                for db_object in db_objects:
                    try:
                        path = get_directory_path(db_object)
                        db_object.content_size = get_path_size(path)
                    except Exception as e:
                        self.stderr.write(f"Failed to get size of {path}: {str(e)}")
                Model.objects.bulk_update(db_objects, ["content_size"])
                total += len(db_objects)
                self.stdout.write(f"\tProcessed {total} objects")
            self.stdout.write(f"Finished for {Model.__name__}")
