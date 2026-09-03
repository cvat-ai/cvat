import functools
import hashlib
import importlib
import io
import tarfile
from enum import StrEnum, auto
from pathlib import Path

import requests
from django.conf import settings
from django.contrib.sessions.backends.base import SessionBase
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential

from cvat.apps.iam import exceptions
from cvat.utils.http import make_requests_session

_OPA_RULES_PATHS = {
    Path(__file__).parent / "rules",
}


@functools.lru_cache(maxsize=None)
def get_opa_bundle() -> tuple[bytes, str]:
    bundle_file = io.BytesIO()

    with tarfile.open(fileobj=bundle_file, mode="w:gz") as tar:
        for p in _OPA_RULES_PATHS:
            for f in p.glob("*.rego"):
                if not f.name.endswith(".gen.rego"):
                    tar.add(name=f, arcname=f.relative_to(p.parent))

    bundle = bundle_file.getvalue()
    etag = hashlib.blake2b(bundle).hexdigest()
    return bundle, etag


def add_opa_rules_path(path: Path) -> None:
    _OPA_RULES_PATHS.add(path)
    get_opa_bundle.cache_clear()


def get_dummy_or_regular_user(email: str):
    """
    A dummy user is created by CVAT when an invitation to an organization is sent.

    A user is considered a dummy if:
    - There is only one User object with the given email
    - The User object has an unusable password which starts with the UNUSABLE_PASSWORD_PREFIX ("!")
    - The User object has no linked EmailAddress object
    """
    from allauth.account.models import EmailAddress
    from allauth.account.utils import filter_users_by_email

    users = filter_users_by_email(email)
    if not users:
        return None, None

    assert len(users) == 1, "More than one user has this email"

    user = users[0]
    if user.has_usable_password():
        return None, user
    try:
        EmailAddress.objects.get_for_user(user, email)
    except EmailAddress.DoesNotExist:
        return user, None

    # account was created using social login
    return None, user


def is_signup_email_required() -> bool:
    from allauth.account import app_settings as allauth_settings

    email_field = allauth_settings.SIGNUP_FIELDS.get("email")
    return bool(email_field and email_field["required"])


def clean_up_sessions() -> None:
    SessionStore: type[SessionBase] = importlib.import_module(settings.SESSION_ENGINE).SessionStore
    SessionStore.clear_expired()


class DisposableEmailResultEnum(StrEnum):
    DISPOSABLE = auto()
    OK = auto()
    DEAD_SERVER = auto()
    INVALID_MX = auto()
    UNKNOWN = auto()


@retry(
    retry=retry_if_exception_type(exceptions.RetryableRequestDomainStatusApiException),
    stop=stop_after_attempt(3),
    wait=wait_random_exponential(multiplier=0.1, max=0.9),
    reraise=True,
)
def request_domain_status_via_emaillistverify(domain: str) -> DisposableEmailResultEnum:
    try:
        with make_requests_session() as session:
            response = session.post(
                settings.DISPOSABLE_EMAIL_CHECK_API_URL,
                params={"domain": domain},
                headers={"x-api-key": settings.DISPOSABLE_EMAIL_CHECK_API_KEY},
                timeout=3,
            )
    except requests.RequestException as e:
        raise exceptions.RetryableRequestDomainStatusApiException(
            f"Disposable domain check for {domain!r} failed: {e}"
        ) from e

    if response.status_code >= 500 or response.status_code in (408, 429):
        raise exceptions.RetryableRequestDomainStatusApiException(
            f"Disposable domain check for {domain!r} failed: HTTP {response.status_code}"
        )

    match response.status_code:
        case 201:
            result = DisposableEmailResultEnum(response.json()["result"])

            if result == DisposableEmailResultEnum.UNKNOWN:
                raise exceptions.RetryableRequestDomainStatusApiException(
                    f"Could not verify email domain {domain!r}"
                )

            return result
        case 401:
            raise exceptions.NonRetryableRequestDomainStatusApiException("Invalid API key")
        case 403:
            raise exceptions.NonRetryableRequestDomainStatusApiException("Not enough credits")
        case _:
            raise exceptions.NonRetryableRequestDomainStatusApiException(
                f"Unknown error: HTTP {response.status_code}"
            )
