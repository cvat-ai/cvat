import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")

import django
django.setup()

from django.contrib.auth.models import User

users = User.objects.all()
for user in users:
    print(user.username)
