from pathlib import Path
import tarfile

from django.conf import settings

def create_opa_bundle():
    bundle_path = Path(settings.IAM_OPA_BUNDLE_PATH)
    if bundle_path.is_file():
        bundle_path.unlink()

    rules_paths = [Path(settings.BASE_DIR) / rel_path for rel_path in settings.IAM_OPA_RULES_PATH.strip(':').split(':')]

    with tarfile.open(bundle_path, 'w:gz') as tar:
        for p in rules_paths:
            for f in p.glob('*[!.gen].rego'):
                tar.add(name=f, arcname=f.relative_to(p.parent))
