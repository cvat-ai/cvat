# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from pathlib import Path
from unittest import mock

from cvat.apps.engine.cloud_provider import (
    CloudStorageClient,
    export_resource_to_cloud_storage,
)


class _FakeCloudStorageClient(CloudStorageClient):
    """Minimal concrete CloudStorageClient for testing key_with_prefix() and
    export_resource_to_cloud_storage() without a real S3/Azure/GCS backend."""

    def __init__(self, *, prefix=None):
        super().__init__(prefix=prefix)
        self.uploaded = []

    @property
    def name(self):
        return "fake"

    def get_status(self):
        raise NotImplementedError

    def get_file_status(self, key, /):
        raise NotImplementedError

    def get_file_last_modified(self, key, /):
        raise NotImplementedError

    def _download_fileobj_to_stream(self, key, stream, /):
        raise NotImplementedError

    def upload_fileobj(self, file_obj, key, /):
        raise NotImplementedError

    def upload_file(self, file_path, key=None, /):
        self.uploaded.append((file_path, key))

    def bulk_delete(self, files):
        raise NotImplementedError

    def _list_raw_content_on_one_page(self, prefix="", *, next_token=None, page_size=None):
        raise NotImplementedError


class TestKeyWithPrefix(unittest.TestCase):
    def test_no_prefix_returns_key_unchanged(self):
        client = _FakeCloudStorageClient(prefix=None)
        self.assertEqual(client.key_with_prefix("task_1_backup.zip"), "task_1_backup.zip")

    def test_prefix_is_joined_onto_the_key(self):
        client = _FakeCloudStorageClient(prefix="exports/2026")
        self.assertEqual(
            client.key_with_prefix("task_1_backup.zip"), "exports/2026/task_1_backup.zip"
        )

    def test_trailing_slash_on_prefix_does_not_double(self):
        client = _FakeCloudStorageClient(prefix="exports/2026/")
        self.assertEqual(
            client.key_with_prefix("task_1_backup.zip"), "exports/2026/task_1_backup.zip"
        )


class TestExportResourceToCloudStorageRespectsPrefix(unittest.TestCase):
    """Regression test for the export path silently ignoring the storage's configured
    prefix: upload_file() takes the key as-is, and only export_resource_to_cloud_storage()
    generates its own key rather than obtaining one from prefix-aware listing, so it is the
    one call site that needs the prefix applied explicitly."""

    def test_upload_key_includes_the_configured_prefix(self):
        client = _FakeCloudStorageClient(prefix="exports/2026")
        db_storage = mock.Mock()
        db_storage.get_client.return_value = client

        with (
            mock.patch("cvat.apps.engine.cloud_provider.get_current_job", return_value=mock.Mock()),
            mock.patch("cvat.apps.engine.cloud_provider.ExportRQMeta") as mock_rq_meta,
        ):
            mock_rq_meta.for_job.return_value = mock.Mock(result_filename="task_1_backup.zip")

            result = export_resource_to_cloud_storage(db_storage, lambda: "/tmp/local_backup.zip")

        self.assertEqual(result, "/tmp/local_backup.zip")
        self.assertEqual(len(client.uploaded), 1)
        uploaded_path, uploaded_key = client.uploaded[0]
        self.assertEqual(uploaded_path, Path("/tmp/local_backup.zip"))
        # The bug this pins: before the fix, the key was the bare result_filename,
        # landing every export at the bucket root instead of under the storage's
        # configured prefix.
        self.assertEqual(uploaded_key, "exports/2026/task_1_backup.zip")

    def test_no_prefix_configured_uploads_the_bare_filename(self):
        client = _FakeCloudStorageClient(prefix=None)
        db_storage = mock.Mock()
        db_storage.get_client.return_value = client

        with (
            mock.patch("cvat.apps.engine.cloud_provider.get_current_job", return_value=mock.Mock()),
            mock.patch("cvat.apps.engine.cloud_provider.ExportRQMeta") as mock_rq_meta,
        ):
            mock_rq_meta.for_job.return_value = mock.Mock(result_filename="task_1_backup.zip")

            export_resource_to_cloud_storage(db_storage, lambda: "/tmp/local_backup.zip")

        self.assertEqual(client.uploaded[0][1], "task_1_backup.zip")


if __name__ == "__main__":
    unittest.main()
