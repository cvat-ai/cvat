# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
from functools import partial
from http import HTTPStatus
from typing import Any, Optional

import pytest
from cvat_sdk.api_client import ApiClient, models
from cvat_sdk.api_client.api_client import Endpoint
from cvat_sdk.api_client.model.file_info import FileInfo
from deepdiff import DeepDiff
from PIL import Image

from shared.utils.config import get_method, make_api_client
from shared.utils.s3 import make_client as make_s3_client

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

    def test_can_remove_owner_and_fetch_with_sdk(self, admin_user, cloud_storages):
        # test for API schema regressions
        source_storage = next(
            s for s in cloud_storages if s.get("owner") and s["owner"]["username"] != admin_user
        ).copy()

        with make_api_client(admin_user) as api_client:
            api_client.users_api.destroy(source_storage["owner"]["id"])

            (_, response) = api_client.cloudstorages_api.retrieve(source_storage["id"])
            fetched_storage = json.loads(response.data)

        source_storage["owner"] = None
        assert DeepDiff(source_storage, fetched_storage, ignore_order=True) == {}


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


@pytest.mark.usefixtures("restore_db_per_function")
class TestGetCloudStorageContent:
    USER = "admin1"

    def _test_get_cloud_storage_content(
        self,
        cloud_storage_id: int,
        manifest: Optional[str] = None,
        **kwargs,
    ):
        with make_api_client(self.USER) as api_client:
            content_kwargs = {"manifest_path": manifest} if manifest else {}

            for item in ["next_token", "prefix", "page_size"]:
                if item_value := kwargs.get(item):
                    content_kwargs[item] = item_value

            (data, _) = api_client.cloudstorages_api.retrieve_content_v2(
                cloud_storage_id, **content_kwargs
            )

            return data

    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize(
        "manifest, prefix, default_bucket_prefix, page_size, expected_content",
        [
            (
                # [v2] list the top level of bucket with based on manifest
                "sub/manifest.jsonl",
                None,
                None,
                None,
                [FileInfo(mime_type="DIR", name="sub", type="DIR")],
            ),
            (
                # [v2] search by some prefix in bucket content based on manifest
                "sub/manifest.jsonl",
                "sub/image_case_65_1",
                None,
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                # [v2] list the second layer (directory "sub") of bucket content based on manifest
                "sub/manifest.jsonl",
                "sub/",
                None,
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_2.png", type="REG"),
                ],
            ),
            (
                # [v2] list the top layer of real bucket content
                None,
                None,
                None,
                None,
                [FileInfo(mime_type="DIR", name="sub", type="DIR")],
            ),
            (
                # [v2] list the second layer (directory "sub") of real bucket content
                None,
                "sub/",
                None,
                2,
                [
                    FileInfo(mime_type="unknown", name="demo_manifest.jsonl", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                None,
                "/sub/",  # cover case: API is identical to share point API
                None,
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
            (
                # [v2] list bucket content based on manifest when default bucket prefix is set to directory
                "sub/manifest.jsonl",
                None,
                "sub/",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                    FileInfo(mime_type="image", name="image_case_65_2.png", type="REG"),
                ],
            ),
            (
                # [v2] list bucket content based on manifest when default bucket prefix
                # is set to template from which the files should start
                "sub/manifest.jsonl",
                None,
                "sub/image_case_65_1",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                # [v2] list bucket content based on manifest when specified prefix is stricter than default bucket prefix
                "sub/manifest.jsonl",
                "sub/image_case_65_1",
                "sub/image_case",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                # [v2] list bucket content based on manifest when default bucket prefix is stricter than specified prefix
                "sub/manifest.jsonl",
                "sub/image_case",
                "sub/image_case_65_1",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                # [v2] list bucket content based on manifest when default bucket prefix and specified prefix have no intersection
                "sub/manifest.jsonl",
                "sub/image_case_65_1",
                "sub/image_case_65_2",
                None,
                [],
            ),
            (
                # [v2] list bucket content based on manifest when default bucket prefix contains dirs and prefix starts with it
                "sub/manifest.jsonl",
                "s",
                "sub/",
                None,
                [
                    FileInfo(mime_type="DIR", name="sub", type="DIR"),
                ],
            ),
            (
                # [v2] list real bucket content when default bucket prefix is set to directory
                None,
                None,
                "sub/",
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
            (
                # [v2] list real bucket content when default bucket prefix
                # is set to template from which the files should start
                None,
                None,
                "sub/demo",
                None,
                [
                    FileInfo(mime_type="unknown", name="demo_manifest.jsonl", type="REG"),
                ],
            ),
            (
                # [v2] list real bucket content when specified prefix is stricter than default bucket prefix
                None,
                "sub/image_case_65_1",
                "sub/image_case",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                # [v2] list real bucket content when default bucket prefix is stricter than specified prefix
                None,
                "sub/image_case",
                "sub/image_case_65_1",
                None,
                [
                    FileInfo(mime_type="image", name="image_case_65_1.png", type="REG"),
                ],
            ),
            (
                # [v2] list real bucket content when default bucket prefix and specified prefix have no intersection
                None,
                "sub/image_case_65_1",
                "sub/image_case_65_2",
                None,
                [],
            ),
            (
                # [v2] list real bucket content when default bucket prefix contains dirs and prefix starts with it
                None,
                "s",
                "sub/",
                None,
                [
                    FileInfo(mime_type="DIR", name="sub", type="DIR"),
                ],
            ),
        ],
    )
    def test_get_cloud_storage_content(
        self,
        cloud_storage_id: int,
        manifest: Optional[str],
        prefix: Optional[str],
        default_bucket_prefix: Optional[str],
        page_size: Optional[int],
        expected_content: Optional[Any],
        cloud_storages,
    ):
        if default_bucket_prefix:
            cloud_storage = cloud_storages[cloud_storage_id]

            with make_api_client(self.USER) as api_client:
                (_, response) = api_client.cloudstorages_api.partial_update(
                    cloud_storage_id,
                    patched_cloud_storage_write_request={
                        "specific_attributes": f'{cloud_storage["specific_attributes"]}&prefix={default_bucket_prefix}'
                    },
                )
                assert response.status == HTTPStatus.OK

        result = self._test_get_cloud_storage_content(
            cloud_storage_id, manifest, prefix=prefix, page_size=page_size
        )
        if expected_content:
            assert result["content"] == expected_content
        if page_size:
            assert len(result["content"]) <= page_size

    @pytest.mark.parametrize("cloud_storage_id, prefix, page_size", [(2, "sub/", 2)])
    def test_iterate_over_cloud_storage_content(
        self, cloud_storage_id: int, prefix: str, page_size: int
    ):
        expected_content = self._test_get_cloud_storage_content(cloud_storage_id, prefix=prefix)[
            "content"
        ]

        current_content = []
        next_token = None
        while True:
            result = self._test_get_cloud_storage_content(
                cloud_storage_id,
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

    @pytest.mark.parametrize("cloud_storage_id", [2])
    def test_can_get_storage_content_with_manually_created_dirs(
        self,
        cloud_storage_id: int,
        request,
        cloud_storages,
    ):
        initial_content = self._test_get_cloud_storage_content(cloud_storage_id)["content"]
        s3_client = make_s3_client()
        cs_name = cloud_storages[cloud_storage_id]["resource"]
        new_directory = "manually_created_directory/"

        # directory is 0 size object that has a name ending with a forward slash
        s3_client.create_file(
            bucket=cs_name,
            filename=new_directory,
        )
        request.addfinalizer(
            partial(
                s3_client.remove_file,
                bucket=cs_name,
                filename=new_directory,
            )
        )

        content = self._test_get_cloud_storage_content(
            cloud_storage_id,
        )["content"]
        assert len(initial_content) + 1 == len(content)
        assert any(
            new_directory.strip("/") == x["name"] and "DIR" == str(x["type"]) for x in content
        )

        content = self._test_get_cloud_storage_content(
            cloud_storage_id,
            prefix=new_directory,
        )["content"]
        assert not len(content)


@pytest.mark.usefixtures("restore_db_per_class")
class TestListCloudStorages:
    def _test_can_see_cloud_storages(self, user, data, **kwargs):
        response = get_method(user, "cloudstorages", **kwargs)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(data, response.json()["results"]) == {}

    def test_admin_can_see_all_cloud_storages(self, cloud_storages):
        self._test_can_see_cloud_storages("admin2", cloud_storages.raw, page_size="all")

    @pytest.mark.parametrize("field_value, query_value", [(2, 2), (None, "")])
    def test_can_filter_by_org_id(self, field_value, query_value, cloud_storages):
        cloud_storages = filter(lambda i: i["organization"] == field_value, cloud_storages)
        self._test_can_see_cloud_storages(
            "admin2", list(cloud_storages), page_size="all", org_id=query_value
        )
