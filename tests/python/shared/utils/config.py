# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

import requests
import urllib3
from cvat_sdk.api_client import ApiClient, Configuration
from cvat_sdk.core.client import Client, Config

ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "utils")
ASSETS_DIR = (ROOT_DIR / "assets").resolve()
SHARE_DIR = (ROOT_DIR.parents[1] / "mounted_file_share").resolve()
# Suppress the warning from Bandit about hardcoded passwords
USER_PASS = "!Q@W#E$R"  # nosec
BASE_URL = "http://localhost:8080"
API_URL = BASE_URL + "/api/"

# Default interval, in seconds, between polls when waiting for a background
# request to finish (SDK status checks, REST/CLI poll-waits).
DEFAULT_INTERVAL = 0.1

# Short HTTP request timeout (connect, read) for SDK/CLI clients in tests. Keeps
# a request blocked on a dead/stale connection from hanging: it fails fast with
# a clear error, well before the pytest-timeout kills the test with an opaque
# "Timeout >Ns". Read timeout stays comfortably above any legitimate single
# response (test traffic is sub-second) yet below the pytest-timeout.
TEST_REQUEST_TIMEOUT = (5.0, 10.0)

# MiniIO settings
MINIO_KEY = "minio_access_key"
MINIO_SECRET_KEY = "minio_secret_key"  # nosec
MINIO_ENDPOINT_URL = "http://localhost:9000"
IMPORT_EXPORT_BUCKET_ID = 3


def _to_query_params(**kwargs):
    return "&".join([f"{k}={v}" for k, v in kwargs.items()])


def get_server_url(endpoint, **kwargs):
    return BASE_URL + "/" + endpoint + "?" + _to_query_params(**kwargs)


def get_api_url(endpoint, **kwargs):
    return API_URL + endpoint + "?" + _to_query_params(**kwargs)


def get_method(username, endpoint, **kwargs):
    return requests.get(
        get_api_url(endpoint, **kwargs), auth=(username, USER_PASS), timeout=TEST_REQUEST_TIMEOUT
    )


def options_method(username, endpoint, **kwargs):
    return requests.options(
        get_api_url(endpoint, **kwargs), auth=(username, USER_PASS), timeout=TEST_REQUEST_TIMEOUT
    )


def delete_method(username, endpoint, **kwargs):
    return requests.delete(
        get_api_url(endpoint, **kwargs), auth=(username, USER_PASS), timeout=TEST_REQUEST_TIMEOUT
    )


def patch_method(username, endpoint, data, **kwargs):
    return requests.patch(
        get_api_url(endpoint, **kwargs),
        json=data,
        auth=(username, USER_PASS),
        timeout=TEST_REQUEST_TIMEOUT,
    )


def post_method(username, endpoint, data, **kwargs):
    return requests.post(
        get_api_url(endpoint, **kwargs),
        json=data,
        auth=(username, USER_PASS),
        timeout=TEST_REQUEST_TIMEOUT,
    )


def post_files_method(username, endpoint, data, files, **kwargs):
    return requests.post(
        get_api_url(endpoint, **kwargs),
        data=data,
        files=files,
        auth=(username, USER_PASS),
        timeout=TEST_REQUEST_TIMEOUT,
    )


def put_method(username, endpoint, data, **kwargs):
    return requests.put(
        get_api_url(endpoint, **kwargs),
        json=data,
        auth=(username, USER_PASS),
        timeout=TEST_REQUEST_TIMEOUT,
    )


def server_get(username, endpoint, **kwargs):
    return requests.get(
        get_server_url(endpoint, **kwargs), auth=(username, USER_PASS), timeout=TEST_REQUEST_TIMEOUT
    )


def make_sdk_client_config(**kwargs) -> Config:
    """Build a cvat_sdk Config with test-friendly defaults applied to clients."""
    kwargs.setdefault("request_timeout", TEST_REQUEST_TIMEOUT)
    return Config(**kwargs)


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
    configuration.timeout = urllib3.Timeout(
        connect=TEST_REQUEST_TIMEOUT[0], read=TEST_REQUEST_TIMEOUT[1]
    )
    if access_token:
        configuration.access_token = access_token
    else:
        configuration.username = user
        configuration.password = password or USER_PASS

    return ApiClient(configuration=configuration)


@contextmanager
def make_sdk_client(user: str, *, password: str = None) -> Generator[Client, None, None]:
    with Client(
        BASE_URL, config=make_sdk_client_config(status_check_period=DEFAULT_INTERVAL)
    ) as client:
        client.login((user, password or USER_PASS))
        yield client
