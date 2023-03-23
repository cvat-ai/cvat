# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
from http import HTTPStatus

import pytest
from cvat_sdk.api_client import ApiClient, models
from cvat_sdk.api_client.api_client import Endpoint
from deepdiff import DeepDiff
from PIL import Image

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase

# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
pytestmark = [pytest.mark.with_external_services]


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetCloudStorage:
    def _test_can_see(self, user, storage_id, data, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve(
                id=storage_id,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.OK
            response_json = json.loads(response.data)

            assert (
                DeepDiff(
                    data, response_json, ignore_order=True, exclude_paths="root['updated_date']"
                )
                == {}
            )

    def _test_cannot_see(self, user, storage_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve(
                id=storage_id,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("storage_id", [1])
    @pytest.mark.parametrize(
        "group, is_owner, is_allow",
        [
            ("admin", False, True),
            ("business", False, False),
            ("user", True, True),
        ],
    )
    def test_sandbox_user_get_cloud_storage(
        self, storage_id, group, is_owner, is_allow, users, cloud_storages
    ):
        org = ""
        cloud_storage = cloud_storages[storage_id]
        username = (
            cloud_storage["owner"]["username"]
            if is_owner
            else next(
                (
                    u
                    for u in users
                    if group in u["groups"] and u["id"] != cloud_storage["owner"]["id"]
                )
            )["username"]
        )

        if is_allow:
            self._test_can_see(username, storage_id, cloud_storage, org=org)
        else:
            self._test_cannot_see(username, storage_id, org=org)

    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize("storage_id", [2])
    @pytest.mark.parametrize(
        "role, is_owner, is_allow",
        [
            ("worker", True, True),
            ("supervisor", False, True),
            ("worker", False, False),
        ],
    )
    def test_org_user_get_cloud_storage(
        self, org_id, storage_id, role, is_owner, is_allow, find_users, cloud_storages
    ):
        cloud_storage = cloud_storages[storage_id]
        username = (
            cloud_storage["owner"]["username"]
            if is_owner
            else next(
                (
                    u
                    for u in find_users(role=role, org=org_id)
                    if u["id"] != cloud_storage["owner"]["id"]
                )
            )["username"]
        )

        if is_allow:
            self._test_can_see(username, storage_id, cloud_storage, org_id=org_id)
        else:
            self._test_cannot_see(username, storage_id, org_id=org_id)


class TestCloudStoragesListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
        "name": ["display_name"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, cloud_storages):
        self.user = admin_user
        self.samples = cloud_storages

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.cloudstorages_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("provider_type", "name", "resource", "credentials_type", "owner"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostCloudStorage:
    _SPEC = {
        "provider_type": "AWS_S3_BUCKET",
        "resource": "test",
        "display_name": "Bucket",
        "credentials_type": "KEY_SECRET_KEY_PAIR",
        "key": "minio_access_key",
        "secret_key": "minio_secret_key",
        "specific_attributes": "endpoint_url=http://minio:9000",
        "description": "Some description",
        "manifests": ["manifest.jsonl"],
    }
    _EXCLUDE_PATHS = [
        f"root['{extra_field}']"
        for extra_field in {
            # unchanged fields
            "created_date",
            "id",
            "organization",
            "owner",
            "updated_date",
            # credentials that server doesn't return
            "key",
            "secret_key",
        }
    ]

    def _test_can_create(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.create(
                models.CloudStorageWriteRequest(**spec),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.CREATED
            response_json = json.loads(response.data)

            assert (
                DeepDiff(
                    self._SPEC, response_json, ignore_order=True, exclude_paths=self._EXCLUDE_PATHS
                )
                == {}
            )

    def _test_cannot_create(self, user, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.create(
                models.CloudStorageWriteRequest(**spec),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("group, is_allow", [("user", True), ("worker", False)])
    def test_sandbox_user_create_cloud_storage(self, group, is_allow, users):
        org = ""
        username = [u for u in users if group in u["groups"]][0]["username"]

        if is_allow:
            self._test_can_create(username, self._SPEC, org=org)
        else:
            self._test_cannot_create(username, self._SPEC, org=org)

    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize(
        "role, is_allow",
        [
            ("owner", True),
            ("maintainer", True),
            ("worker", False),
            ("supervisor", False),
        ],
    )
    def test_org_user_create_cloud_storage(self, org_id, role, is_allow, find_users):
        username = find_users(role=role, org=org_id)[0]["username"]

        if is_allow:
            self._test_can_create(username, self._SPEC, org_id=org_id)
        else:
            self._test_cannot_create(username, self._SPEC, org_id=org_id)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchCloudStorage:
    _SPEC = {
        "display_name": "New display name",
        "description": "New description",
        "manifests": [
            "manifest_1.jsonl",
            "manifest_2.jsonl",
        ],
    }
    _PRIVATE_BUCKET_SPEC = {
        "display_name": "New display name",
        "description": "New description",
        "manifests": [
            "sub/manifest_1.jsonl",
            "sub/manifest_2.jsonl",
        ],
    }
    _EXCLUDE_PATHS = [
        f"root['{extra_field}']"
        for extra_field in {
            # unchanged fields
            "created_date",
            "credentials_type",
            "id",
            "organization",
            "owner",
            "provider_type",
            "resource",
            "specific_attributes",
            "updated_date",
        }
    ]

    def _test_can_update(self, user, storage_id, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.partial_update(
                id=storage_id,
                patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(**spec),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.OK
            response_json = json.loads(response.data)

            assert (
                DeepDiff(spec, response_json, ignore_order=True, exclude_paths=self._EXCLUDE_PATHS)
                == {}
            )

    def _test_cannot_update(self, user, storage_id, spec, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.partial_update(
                id=storage_id,
                patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(**spec),
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("storage_id", [1])
    @pytest.mark.parametrize(
        "group, is_owner, is_allow",
        [
            ("admin", False, True),
            ("business", False, False),
            ("worker", True, True),
        ],
    )
    def test_sandbox_user_update_cloud_storage(
        self, storage_id, group, is_owner, is_allow, users, cloud_storages
    ):
        org = ""
        cloud_storage = cloud_storages[storage_id]
        username = (
            cloud_storage["owner"]["username"]
            if is_owner
            else next(
                (
                    u
                    for u in users
                    if group in u["groups"] and u["id"] != cloud_storage["owner"]["id"]
                )
            )["username"]
        )

        if is_allow:
            self._test_can_update(username, storage_id, self._SPEC, org=org)
        else:
            self._test_cannot_update(username, storage_id, self._SPEC, org=org)

    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize("storage_id", [2])
    @pytest.mark.parametrize(
        "role, is_owner, is_allow",
        [
            ("worker", True, True),
            ("maintainer", False, True),
            ("supervisor", False, False),
        ],
    )
    def test_org_user_update_cloud_storage(
        self, org_id, storage_id, role, is_owner, is_allow, find_users, cloud_storages
    ):
        cloud_storage = cloud_storages[storage_id]
        username = (
            cloud_storage["owner"]["username"]
            if is_owner
            else next(
                (
                    u
                    for u in find_users(role=role, org=org_id)
                    if u["id"] != cloud_storage["owner"]["id"]
                )
            )["username"]
        )

        if is_allow:
            self._test_can_update(username, storage_id, self._PRIVATE_BUCKET_SPEC, org_id=org_id)
        else:
            self._test_cannot_update(username, storage_id, self._PRIVATE_BUCKET_SPEC, org_id=org_id)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetCloudStoragePreview:
    def _test_can_see(self, user, storage_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve_preview(
                id=storage_id,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.OK

            (width, height) = Image.open(io.BytesIO(response.data)).size
            assert width > 0 and height > 0

    def _test_cannot_see(self, user, storage_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve_preview(
                id=storage_id,
                **kwargs,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("storage_id", [1])
    @pytest.mark.parametrize(
        "group, is_owner, is_allow",
        [
            ("admin", False, True),
            ("business", False, False),
            ("user", True, True),
        ],
    )
    def test_sandbox_user_get_cloud_storage_preview(
        self, storage_id, group, is_owner, is_allow, users, cloud_storages
    ):
        org = ""
        cloud_storage = cloud_storages[storage_id]
        username = (
            cloud_storage["owner"]["username"]
            if is_owner
            else next(
                (
                    u
                    for u in users
                    if group in u["groups"] and u["id"] != cloud_storage["owner"]["id"]
                )
            )["username"]
        )

        if is_allow:
            self._test_can_see(username, storage_id, org=org)
        else:
            self._test_cannot_see(username, storage_id, org=org)

    @pytest.mark.parametrize("org_id", [2])
    @pytest.mark.parametrize("storage_id", [2])
    @pytest.mark.parametrize(
        "role, is_owner, is_allow",
        [
            ("worker", True, True),
            ("supervisor", False, True),
            ("worker", False, False),
        ],
    )
    def test_org_user_get_cloud_storage_preview(
        self, org_id, storage_id, role, is_owner, is_allow, find_users, cloud_storages
    ):
        cloud_storage = cloud_storages[storage_id]
        username = (
            cloud_storage["owner"]["username"]
            if is_owner
            else next(
                (
                    u
                    for u in find_users(role=role, org=org_id)
                    if u["id"] != cloud_storage["owner"]["id"]
                )
            )["username"]
        )

        if is_allow:
            self._test_can_see(username, storage_id, org_id=org_id)
        else:
            self._test_cannot_see(username, storage_id, org_id=org_id)
