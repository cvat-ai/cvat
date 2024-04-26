from pathlib import Path
from typing import Tuple
import functools
import hashlib
import io
import tarfile

from django.conf import settings

@functools.lru_cache()
def get_opa_bundle() -> Tuple[bytes, str]:
    rules_paths = [Path(settings.BASE_DIR) / rel_path for rel_path in settings.IAM_OPA_RULES_PATH.strip(':').split(':')]

    bundle_file = io.BytesIO()

    with tarfile.open(fileobj=bundle_file, mode='w:gz') as tar:
        for p in rules_paths:
            for f in p.glob('*[!.gen].rego'):
                tar.add(name=f, arcname=f.relative_to(p.parent))

    bundle = bundle_file.getvalue()
    etag = hashlib.blake2b(bundle).hexdigest()
    return bundle, etag

def get_dummy_user(email):
    from allauth.account.models import EmailAddress
    from allauth.account import app_settings
    from allauth.account.utils import filter_users_by_email

    users = filter_users_by_email(email)
    if not users or len(users) > 1:
        return None
    user = users[0]
    if user.has_usable_password():
        return None
    if app_settings.EMAIL_VERIFICATION == \
            app_settings.EmailVerificationMethod.MANDATORY:
        email = EmailAddress.objects.get_for_user(user, email)
        if email.verified:
            return None
    return user
