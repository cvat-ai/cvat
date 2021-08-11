from django.apps import AppConfig

class AuthConfig(AppConfig):
    name = 'iam'

    def ready(self):
        from . import signals # pylint: disable=unused-import
