#!/usr/bin/bash

set -x

# Create admin user
PYCMD="\"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\""
docker exec -i cvat_server /bin/bash -c "echo $PYCMD | python3 ~/manage.py shell"

# setup shared resources
npx cypress run --headless --browser chrome --spec cypress/e2e/setup/setup.js
