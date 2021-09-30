from django.apps import AppConfig

class IAMConfig(AppConfig):
    name = 'cvat.apps.iam'

    def ready(self):
        from . import signals # pylint: disable=unused-import
