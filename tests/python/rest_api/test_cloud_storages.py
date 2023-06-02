# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
from enum import Enum
from http import HTTPStatus
from typing import Any, Optional

import pytest
from cvat_sdk.api_client import ApiClient, models
from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.api_client.model.file_info import FileInfo
from deepdiff import DeepDiff
from PIL import Image

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase

# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
pytestmark = [pytest.mark.with_external_services]


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetCloudStorage:
    def _test_can_see(self, user, storage_id, data):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve(
                id=storage_id,
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

    def _test_cannot_see(self, user, storage_id):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve(
                id=storage_id,
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
            self._test_can_see(username, storage_id, cloud_storage)
        else:
            self._test_cannot_see(username, storage_id)

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
            self._test_can_see(username, storage_id, cloud_storage)
        else:
            self._test_cannot_see(username, storage_id)


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

    def _test_can_update(self, user, storage_id, spec):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.partial_update(
                id=storage_id,
                patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(**spec),
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.OK
            response_json = json.loads(response.data)

            assert (
                DeepDiff(spec, response_json, ignore_order=True, exclude_paths=self._EXCLUDE_PATHS)
                == {}
            )

    def _test_cannot_update(self, user, storage_id, spec):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.partial_update(
                id=storage_id,
                patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(**spec),
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
            self._test_can_update(username, storage_id, self._SPEC)
        else:
            self._test_cannot_update(username, storage_id, self._SPEC)

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
            self._test_can_update(username, storage_id, self._PRIVATE_BUCKET_SPEC)
        else:
            self._test_cannot_update(username, storage_id, self._PRIVATE_BUCKET_SPEC)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetCloudStoragePreview:
    def _test_can_see(self, user, storage_id):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve_preview(
                id=storage_id,
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.OK

            (width, height) = Image.open(io.BytesIO(response.data)).size
            assert width > 0 and height > 0

    def _test_cannot_see(self, user, storage_id):
        with make_api_client(user) as api_client:
            (_, response) = api_client.cloudstorages_api.retrieve_preview(
                id=storage_id,
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
            self._test_can_see(username, storage_id)
        else:
            self._test_cannot_see(username, storage_id)

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
            self._test_can_see(username, storage_id)
        else:
            self._test_cannot_see(username, storage_id)


class TestGetCloudStorageContent:
    USER = "admin1"

    class SUPPORTED_VERSIONS(str, Enum):
        V1 = "v1"
        V2 = "v2"

    def _test_get_cloud_storage_content(
        self,
        cloud_storage_id: int,
        version: SUPPORTED_VERSIONS = SUPPORTED_VERSIONS.V2,
        manifest: Optional[str] = None,
        **kwargs,
    ):
        with make_api_client(self.USER) as api_client:
            content_kwargs = {"manifest_path": manifest} if manifest else {}

            if version == self.SUPPORTED_VERSIONS.V2:
                for item in ["next_token", "prefix", "page_size"]:
                    if item_value := kwargs.get(item):
                        content_kwargs[item] = item_value

            methods = {
                self.SUPPORTED_VERSIONS.V1: api_client.cloudstorages_api.retrieve_content,
                self.SUPPORTED_VERSIONS.V2: api_client.cloudstorages_api.retrieve_content_v2,
            }
            (data, _) = methods[version](cloud_storage_id, **content_kwargs)

            return data

    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize(
        "version, manifest, prefix, page_size, expected_content",
        [
            (
                SUPPORTED_VERSIONS.V1,  # [v1] list all bucket content
                "sub/manifest.jsonl",
                None,
                None,
                ["sub/image_case_65_1.png", "sub/image_case_65_2.png"],
            ),
            (
                SUPPORTED_VERSIONS.V2,  # [v2] list the top level of bucket with based on manifest
                "sub/manifest.jsonl",
                None,
                None,
                [FileInfo(mime_type="DIR", name="sub", type="DIR")],
            ),
            (
                SUPPORTED_VERSIONS.V2,  # [v2] search by some prefix in bucket content based on manifest
                "sub/manifest.jsonl",
                "sub/image_case_65_1",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                SUPPORTED_VERSIONS.V2,  # [v2] list the second layer (directory "sub") of bucket content based on manifest
                "sub/manifest.jsonl",
                "sub/",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_2.png", type="REG"),
                ],
            ),
            (
                SUPPORTED_VERSIONS.V2,  # [v2] list the top layer of real bucket content
                None,
                None,
                None,
                [FileInfo(mime_type="DIR", name="sub", type="DIR")],
            ),
            (
                SUPPORTED_VERSIONS.V2,  # [v2] list the second layer (directory "sub") of real bucket content
                None,
                "sub/",
                2,
                [
                    FileInfo(mime_type="unknown", name="demo_manifest.jsonl", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                SUPPORTED_VERSIONS.V2,
                None,
                "/sub/",  # cover case: API is identical to share point API
                None,
                [
                    FileInfo(mime_type="unknown", name="demo_manifest.jsonl", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_2.png", type="REG"),
                    FileInfo(mime_type="unknown", name="manifest.jsonl", type="REG"),
                    FileInfo(mime_type="unknown", name="manifest_1.jsonl", type="REG"),
                    FileInfo(mime_type="unknown", name="manifest_2.jsonl", type="REG"),
                ],
            ),
        ],
    )
    def test_get_cloud_storage_content(
        self,
        cloud_storage_id: int,
        version: SUPPORTED_VERSIONS,
        manifest: Optional[str],
        prefix: Optional[str],
        page_size: Optional[int],
        expected_content: Optional[Any],
    ):
        result = self._test_get_cloud_storage_content(
            cloud_storage_id, version, manifest, prefix=prefix, page_size=page_size
        )
        if expected_content:
            if version == self.SUPPORTED_VERSIONS.V1:
                assert result == expected_content
            else:
                assert result["content"] == expected_content
        if page_size:
            assert len(result["content"]) <= page_size

    @pytest.mark.parametrize("cloud_storage_id, prefix, page_size", [(2, "sub/", 2)])
    def test_iterate_over_cloud_storage_content(
        self, cloud_storage_id: int, prefix: str, page_size: int
    ):
        expected_content = self._test_get_cloud_storage_content(
            cloud_storage_id, self.SUPPORTED_VERSIONS.V2, prefix=prefix
        )["content"]

        current_content = []
        next_token = None
        while True:
            result = self._test_get_cloud_storage_content(
                cloud_storage_id,
                self.SUPPORTED_VERSIONS.V2,
                prefix=prefix,
                page_size=page_size,
                next_token=next_token,
            )
            content = result["content"]
            assert len(content) <= page_size
            current_content.extend(content)

            next_token = result["next"]
            if not next_token:
                break

        assert expected_content == current_content
