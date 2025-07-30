# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import User
from cvat.apps.engine.user_deletion import UserDeletionManager


class Command(BaseCommand):
    help = "Delete a user and all associated resources by user ID."

    def add_arguments(self, parser):
        parser.add_argument("user_id", type=int, help="ID of the user to delete")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        user_id = options["user_id"]
        dry_run = options["dry_run"]

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise CommandError(f"User #{user_id} does not exist.")

        manager = UserDeletionManager(user)
        try:
            deleted_resources = manager.delete_user_with_cleanup(dry_run=dry_run)
            for resource_type in deleted_resources:
                for resource_id in deleted_resources[resource_type]:
                    self.stdout.write(f"Deleted {resource_type}: #{resource_id}")
        except ValidationError as e:
            raise CommandError(e.detail)
