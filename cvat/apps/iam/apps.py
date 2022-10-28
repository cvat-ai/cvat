from pathlib import Path
import tarfile
from django.apps import AppConfig
from django.conf import settings

class IAMConfig(AppConfig):
    name = 'cvat.apps.iam'

    def ready(self):
        from .signals import register_signals
        register_signals(self)

        bundle_path = Path(settings.IAM_RULE_BUNDLE_PATH)
        if bundle_path.is_file():
            bundle_path.unlink()

        # Prepare OPA rules bundle
        rules_path = Path(settings.BASE_DIR) / 'cvat/apps/iam/rules'
        with tarfile.open(bundle_path, 'w:gz') as tar:
            for f in rules_path.glob('*[!.gen].rego'):
                tar.add(name=f, arcname=f.relative_to(rules_path.parent))
