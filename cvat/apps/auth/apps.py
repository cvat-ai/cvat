from django.apps import AppConfig

class AuthConfig(AppConfig):
    name = 'auth'

    def ready(self):
        from .auth import register_signals

        register_signals()