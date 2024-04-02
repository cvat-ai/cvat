import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")

import django
django.setup()

from django.contrib.auth.models import User

# Get all superusers
users = User.objects.all()

# Delete superusers
users.delete()

print('Deleted all Users')
