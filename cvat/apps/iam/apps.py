import os
from attr.converters import to_bool
from django.apps import AppConfig

from .utils import create_opa_bundle

class IAMConfig(AppConfig):
    name = 'cvat.apps.iam'

    def ready(self):
        from .signals import register_signals
        register_signals(self)

        if to_bool(os.environ.get("IAM_OPA_BUNDLE", False)):
            create_opa_bundle()
