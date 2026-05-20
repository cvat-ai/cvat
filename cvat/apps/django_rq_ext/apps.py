from django.apps import AppConfig


class DjangoRqExtConfig(AppConfig):
    name = "cvat.apps.django_rq_ext"

    def ready(self) -> None:
        from django.conf import settings

        from . import default_settings

        for key in dir(default_settings):
            if key.isupper() and not hasattr(settings, key):
                setattr(settings, key, getattr(default_settings, key))
