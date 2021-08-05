from django.apps import AppConfig


class AuthConfig(AppConfig):
    name = 'auth'

    def ready(self):
        from . import replicator # pylint: disable=unused-import