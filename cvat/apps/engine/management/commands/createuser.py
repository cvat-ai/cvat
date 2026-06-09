# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a new regular user'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username for the new user')
        parser.add_argument('--email', type=str, default='', help='Email address')
        parser.add_argument('--first-name', type=str, default='', help='First name')
        parser.add_argument('--last-name', type=str, default='', help='Last name')
        parser.add_argument('--password', type=str, help='Password (if not provided, user will have unusable password)')

    def handle(self, *args, **options):
        username = options['username']

        if User.objects.filter(username=username).exists():
            raise CommandError(f'User "{username}" already exists')

        user_data = {
            'username': username,
            'email': options['email'],
            'first_name': options['first_name'],
            'last_name': options['last_name'],
        }

        user = User.objects.create_user(**user_data)

        if options['password']:
            user.set_password(options['password'])
            user.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully created user "{username}"'))