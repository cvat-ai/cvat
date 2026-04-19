# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit, urlunsplit

import requests
from cvat_sdk.api_client import ApiClient, Configuration
from cvat_sdk.core.client import Client, Config

ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "utils")
ASSETS_DIR = (ROOT_DIR / "assets").resolve()
# Suppress the warning from Bandit about hardcoded passwords
USER_PASS = "!Q@W#E$R"  # nosec
ADMIN_USER = "admin1"
ADMIN_PASS = USER_PASS
BASE_URL = os.environ.get("CVAT_BASE_URL", "http://localhost:8080")
API_URL = BASE_URL + "/api/"
LEGACY_BASE_URL = "http://localhost:8080"

# MiniIO settings
MINIO_KEY = "minio_access_key"
MINIO_SECRET_KEY = "minio_secret_key"  # nosec
MINIO_ENDPOINT_URL = os.environ.get("CVAT_MINIO_ENDPOINT_URL", "http://localhost:9000")
IMPORT_EXPORT_BUCKET_ID = 3


def get_runtime_webhook_target_url() -> str:
    return os.environ.get(
        "CVAT_TEST_DB_WEBHOOK_RECEIVER_URL",
        os.environ.get("CVAT_TEST_WEBHOOK_RECEIVER_URL", "http://webhooks.internal"),
    )


def get_runtime_cloud_storage_endpoint_url() -> str:
    return os.environ.get("CVAT_TEST_DB_MINIO_ENDPOINT_URL", "http://minio:9000")


def normalize_runtime_asset_urls(
    value,
    *,
    base_url: str | None = None,
    webhook_url: str | None = None,
    minio_url: str | None = None,
):
    # Repo-tracked fixtures keep stable localhost/internal URLs. Rewrite them at
    # load time so the same fixture data works for the active runtime ports and
    # per-run webhook/MinIO endpoints without duplicating fixture snapshots.
    base_url = base_url or os.environ.get("CVAT_BASE_URL", LEGACY_BASE_URL)
    webhook_url = webhook_url or get_runtime_webhook_target_url()
    minio_url = minio_url or get_runtime_cloud_storage_endpoint_url()

    if isinstance(value, str):
        value = value.replace(LEGACY_BASE_URL, base_url)
        value = _rewrite_webhook_url(value, webhook_url=webhook_url)
        value = _rewrite_cloud_storage_attributes(value, minio_url=minio_url)
        return value

    if isinstance(value, list):
        return [
            normalize_runtime_asset_urls(
                v, base_url=base_url, webhook_url=webhook_url, minio_url=minio_url
            )
            for v in value
        ]

    if isinstance(value, dict):
        return {
            k: normalize_runtime_asset_urls(
                v, base_url=base_url, webhook_url=webhook_url, minio_url=minio_url
            )
            for k, v in value.items()
        }

    return value


def _rewrite_webhook_url(value: str, *, webhook_url: str) -> str:
    current = urlsplit(value)
    if current.hostname != "webhooks.internal":
        return value

    runtime = urlsplit(webhook_url)
    path = runtime.path if current.path in {"", "/"} else current.path
    query = current.query or runtime.query
    fragment = current.fragment or runtime.fragment
    return urlunsplit((runtime.scheme, runtime.netloc, path, query, fragment))


def _rewrite_cloud_storage_attributes(value: str, *, minio_url: str) -> str:
    if "endpoint_url=" not in value:
        return value

    parsed = []
    runtime = urlsplit(minio_url)
    for key, attr_value in parse_qsl(value, keep_blank_values=True):
        if key != "endpoint_url":
            parsed.append((key, attr_value))
            continue

        current = urlsplit(unquote(attr_value))
        if current.hostname != "minio":
            parsed.append((key, attr_value))
            continue

        netloc = runtime.hostname or current.hostname or ""
        if runtime.port:
            netloc = f"{netloc}:{current.port or runtime.port}"
        elif current.port:
            netloc = f"{netloc}:{current.port}"

        rewritten = urlunsplit(
            (
                runtime.scheme or current.scheme,
                netloc,
                current.path,
                current.query,
                current.fragment,
            )
        )
        parsed.append((key, rewritten))

    return urlencode(parsed, doseq=True, quote_via=quote)


def _to_query_params(**kwargs):
    return "&".join([f"{k}={v}" for k, v in kwargs.items()])


def get_server_url(endpoint, **kwargs):
    return BASE_URL + "/" + endpoint + "?" + _to_query_params(**kwargs)


def get_api_url(endpoint, **kwargs):
    return API_URL + endpoint + "?" + _to_query_params(**kwargs)


def get_method(username, endpoint, *, timeout=None, **kwargs):
    return requests.get(
        get_api_url(endpoint, **kwargs), auth=(username, USER_PASS), timeout=timeout
    )


def options_method(username, endpoint, **kwargs):
    return requests.options(get_api_url(endpoint, **kwargs), auth=(username, USER_PASS))


def delete_method(username, endpoint, **kwargs):
    return requests.delete(get_api_url(endpoint, **kwargs), auth=(username, USER_PASS))


def patch_method(username, endpoint, data, **kwargs):
    return requests.patch(get_api_url(endpoint, **kwargs), json=data, auth=(username, USER_PASS))


def post_method(username, endpoint, data, **kwargs):
    return requests.post(get_api_url(endpoint, **kwargs), json=data, auth=(username, USER_PASS))


def post_files_method(username, endpoint, data, files, **kwargs):
    return requests.post(
        get_api_url(endpoint, **kwargs), data=data, files=files, auth=(username, USER_PASS)
    )


def put_method(username, endpoint, data, **kwargs):
    return requests.put(get_api_url(endpoint, **kwargs), json=data, auth=(username, USER_PASS))


def server_get(username, endpoint, **kwargs):
    return requests.get(get_server_url(endpoint, **kwargs), auth=(username, USER_PASS))


def make_api_client(
    user: str | None = None,
    *,
    password: str | None = None,
    access_token: str | None = None,
) -> ApiClient:
    assert (
        sum([bool(access_token), bool(user)]) <= 1
    ), "Expected only one of the 'access_token' and 'user' args"

    configuration = Configuration(host=BASE_URL)
    if access_token:
        configuration.access_token = access_token
    else:
        configuration.username = user
        configuration.password = password or USER_PASS

    return ApiClient(configuration=configuration)


@contextmanager
def make_sdk_client(user: str, *, password: str = None) -> Generator[Client, None, None]:
    with Client(BASE_URL, config=Config(status_check_period=0.01)) as client:
        client.login((user, password or USER_PASS))
        yield client
