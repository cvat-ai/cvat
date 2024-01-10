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
