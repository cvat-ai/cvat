# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

import requests
from cvat_sdk.api_client import ApiClient, Configuration
from cvat_sdk.core.client import Client, Config

ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "utils")
ASSETS_DIR = (ROOT_DIR / "assets").resolve()
# Suppress the warning from Bandit about hardcoded passwords
USER_PASS = "!Q@W#E$R"  # nosec
BASE_URL = "http://localhost:8080"
API_URL = BASE_URL + "/api/"

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
    return requests.get(get_api_url(endpoint, **kwargs), auth=(username, USER_PASS))


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
    user: Optional[str] = None,
    *,
    password: Optional[str] = None,
    access_token: Optional[str] = None,
) -> ApiClient:
    assert bool(access_token) ^ bool(user), "Expected only one of the 'api_token' and 'user' args"

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
