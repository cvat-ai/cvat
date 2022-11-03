from pathlib import Path
import tarfile

from django.conf import settings

def create_opa_bundle():
    bundle_path = Path(settings.IAM_OPA_BUNDLE_PATH)
    if bundle_path.is_file():
        bundle_path.unlink()

    rules_path = Path(settings.BASE_DIR) / 'cvat/apps/iam/rules'
    with tarfile.open(bundle_path, 'w:gz') as tar:
        for f in rules_path.glob('*[!.gen].rego'):
            tar.add(name=f, arcname=f.relative_to(rules_path.parent))
