# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import User
from cvat.apps.engine.user_deletion import delete_user_with_cleanup


class Command(BaseCommand):
    help = "Delete a user and all associated resources by user ID."

    def add_arguments(self, parser):
        parser.add_argument("user_id", type=int, help="ID of the user to delete")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        user_id = options["user_id"]
        dry_run = options["dry_run"]

        try:
            deleted_resources = delete_user_with_cleanup(user_id, dry_run=dry_run)
            for resource_type in deleted_resources:
                for resource_id in deleted_resources[resource_type]:
                    self.stdout.write(f"Deleted {resource_type}: #{resource_id}")
        except ValidationError as e:
            raise CommandError(e.detail)
        except User.DoesNotExist:
            raise CommandError(f"User with ID {user_id} does not exist.")
