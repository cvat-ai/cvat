# Copyright (C) 2021 Cnvrg
#
# SPDX-License-Identifier: MIT

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandErrors


class Command(BaseCommand):
    help = 'Creating cvat user'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str)
        parser.add_argument('password', type=str)

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']

        if not username:
            raise CommandError('Poll "%s" does not exist' % poll_id)
        user = User.objects.create_user(username, password=password)
        user.is_superuser = False
        user.is_staff = False
        user.save()

