# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os.path as osp
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.cloudstorages import CloudStorage
from PIL import Image

from shared.utils.config import MINIO_KEY, MINIO_SECRET_KEY, USER_PASS
from shared.utils.helpers import generate_image_files


class TestCloudstorageUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        changedb,  # force fixture call order to allow DB setup
        tmp_path: Path,
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_client: Client,
        fxt_stdout: io.StringIO,
        admin_user: str,
    ):
        self.tmp_path = tmp_path
        _, self.logger_stream = fxt_logger
        self.client = fxt_client
        self.stdout = fxt_stdout
        self.user = admin_user
        self.client.login((self.user, USER_PASS))

        yield

    @pytest.fixture
    def fxt_storage_with_data(self):
        yield self.client.cloud_storages.create(
            models.CloudStorageWriteRequest(
                provider_type="AWS_S3_BUCKET",
                resource="test",
                display_name="foo",
                credentials_type="KEY_SECRET_KEY_PAIR",
                key=MINIO_KEY,
                secret_key=MINIO_SECRET_KEY,
                specific_attributes="endpoint_url=http://minio:9000",
                description="Some description",
                manifests=["manifest.jsonl"],
            )
        )

    def test_can_create_storage(self, fxt_storage_with_data: CloudStorage):
        assert fxt_storage_with_data.display_name == "foo"

    def test_can_retrieve_storage(self, fxt_storage_with_data: CloudStorage):
        storage_id = fxt_storage_with_data.id

        storage = self.client.cloud_storages.retrieve(storage_id)

        assert storage.id == storage_id
        assert self.stdout.getvalue() == ""

    def test_can_list_storages(self, fxt_storage_with_data: CloudStorage):
        storage_id = fxt_storage_with_data.id

        storages = self.client.cloud_storages.list()

        assert any(t.id == storage_id for t in storages)
        assert self.stdout.getvalue() == ""

    def test_can_update_storage(self, fxt_storage_with_data: CloudStorage):
        fxt_storage_with_data.update(models.PatchedCloudStorageWriteRequest(display_name="foo"))

        retrieved_storage = self.client.cloud_storages.retrieve(fxt_storage_with_data.id)
        assert retrieved_storage.display_name == "foo"
        assert fxt_storage_with_data.display_name == retrieved_storage.display_name
        assert self.stdout.getvalue() == ""

    def test_can_delete_storage(self, fxt_storage_with_data: CloudStorage):
        fxt_storage_with_data.remove()

        with pytest.raises(exceptions.NotFoundException):
            fxt_storage_with_data.fetch()
        assert self.stdout.getvalue() == ""

    def test_can_get_storage_actions(self, fxt_storage_with_data: CloudStorage):
        actions = fxt_storage_with_data.get_actions()

        assert actions == {'read', 'write'}

    @pytest.mark.parametrize('manifest_path', ('', 'manifest.jsonl'))
    def test_can_get_storage_manifest_contents(self,
        fxt_storage_with_data: CloudStorage, manifest_path: str
    ):
        files = fxt_storage_with_data.get_content(manifest_path=manifest_path)

        assert set(files) == {'image_case_65_1.png', 'image_case_65_2.png'}

    def test_can_get_storage_status(self, fxt_storage_with_data: CloudStorage):
        status = fxt_storage_with_data.get_status()

        assert status == 'AVAILABLE'

    def test_can_get_cloud_storage_preview(self, fxt_storage_with_data: CloudStorage):
        preview = fxt_storage_with_data.get_preview()

        assert Image.open(preview).size == (256, 256)
