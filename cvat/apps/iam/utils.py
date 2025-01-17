import functools
import hashlib
import importlib
import io
import tarfile
from pathlib import Path

from django.conf import settings
from django.contrib.sessions.backends.base import SessionBase

_OPA_RULES_PATHS = {
    Path(__file__).parent / "rules",
}


@functools.lru_cache(maxsize=None)
def get_opa_bundle() -> tuple[bytes, str]:
    bundle_file = io.BytesIO()

    with tarfile.open(fileobj=bundle_file, mode="w:gz") as tar:
        for p in _OPA_RULES_PATHS:
            for f in p.glob("*[!.gen].rego"):
                tar.add(name=f, arcname=f.relative_to(p.parent))

    bundle = bundle_file.getvalue()
    etag = hashlib.blake2b(bundle).hexdigest()
    return bundle, etag


def add_opa_rules_path(path: Path) -> None:
    _OPA_RULES_PATHS.add(path)
    get_opa_bundle.cache_clear()


def get_dummy_user(email):
    from allauth.account import app_settings
    from allauth.account.models import EmailAddress
    from allauth.account.utils import filter_users_by_email

    users = filter_users_by_email(email)
    if not users or len(users) > 1:
        return None
    user = users[0]
    if user.has_usable_password():
        return None
    if app_settings.EMAIL_VERIFICATION == app_settings.EmailVerificationMethod.MANDATORY:
        email = EmailAddress.objects.get_for_user(user, email)
        if email.verified:
            return None
    return user


def clean_up_sessions() -> None:
    SessionStore: type[SessionBase] = importlib.import_module(settings.SESSION_ENGINE).SessionStore
    SessionStore.clear_expired()
