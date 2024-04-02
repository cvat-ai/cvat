#!/usr/bin/env python3

# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import sys

def create_default_superuser():
    from django.contrib.auth.models import User

    if User.objects.filter(is_superuser=True).count() == 0:
        User.objects.create_superuser('admin', 'admin@example.com', '')

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")
    try:
        from django.core.management import execute_from_command_line
        import django
        django.setup()
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Check if the command is 'runserver' and create a default superuser if needed
    if 'runserver' in sys.argv:
        create_default_superuser()

    execute_from_command_line(sys.argv)

