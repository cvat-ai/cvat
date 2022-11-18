from .production import *

INSTALLED_APPS += [
    'cvat.apps.service_unavailable',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, '/tmp/dummy_db.sqlite3'),
    }
}
