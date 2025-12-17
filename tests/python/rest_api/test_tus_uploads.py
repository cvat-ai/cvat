# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
from http import HTTPStatus

import pytest

from shared.utils.config import BASE_URL, make_api_client
from shared.utils.helpers import generate_image_file


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestTUSUpload:
    """Integration tests for TUS resumable upload protocol"""

    _USERNAME = "admin1"

    @pytest.fixture
    def fxt_task(self):
        """Fixture to create a task for TUS upload tests"""
        with make_api_client(self._USERNAME) as api_client:
            (task, response) = api_client.tasks_api.create({"name": "test TUS upload"})
            assert response.status == HTTPStatus.CREATED
            return task

    def _call_tus_endpoint(self, method, path, headers=None, body=None, check_status=True):
        """Call a low-level TUS endpoint via ApiClient"""
        headers = headers or {}

        with make_api_client(self._USERNAME) as api_client:
            api_client.update_params_for_auth(headers=headers, queries=[], method=method)
            response = api_client.request(
                method,
                path,
                headers=headers,
                body=body,
                _parse_response=False,
                _check_status=check_status,
            )

        return response

    def _start_upload(self, task_id, file_size, filename):
        """Start TUS upload and return location URL"""
        metadata = f"filename {base64.b64encode(filename.encode()).decode()}"

        response = self._call_tus_endpoint(
            "POST",
            BASE_URL + f"/api/tasks/{task_id}/data/",
            headers={
                "Upload-Length": str(file_size),
                "Upload-Metadata": metadata,
                "Tus-Resumable": "1.0.0",
            },
        )

        assert response.status == HTTPStatus.CREATED
        location = response.headers.get("Location")
        assert location is not None
        return location

    def _upload_chunk(self, location, offset, data, check_status=True):
        """Upload a chunk via TUS PATCH request"""
        response = self._call_tus_endpoint(
            "PATCH",
            location,
            headers={
                "Upload-Offset": str(offset),
                "Content-Type": "application/offset+octet-stream",
                "Tus-Resumable": "1.0.0",
            },
            body=data,
            check_status=check_status,
        )
        return response

    def _get_upload_offset(self, location):
        """Get current upload offset via TUS HEAD request"""
        response = self._call_tus_endpoint(
            "HEAD",
            location,
            headers={"Tus-Resumable": "1.0.0"},
        )
        assert response.status == HTTPStatus.OK
        offset = response.headers.get("Upload-Offset")
        assert offset is not None
        return int(offset)

    def test_can_upload_file_via_tus_in_single_chunk(self, fxt_task):
        """Test uploading a complete file in one chunk"""
        task = fxt_task

        image_file = generate_image_file("test_image.jpg", size=(100, 100))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        location = self._start_upload(task.id, file_size, "test_image.jpg")
        response = self._upload_chunk(location, 0, image_data)

        assert response.status == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == file_size

    def test_upload_offset_is_updated_incrementally(self, fxt_task):
        """Test offset updates correctly after each small chunk"""
        task = fxt_task

        image_file = generate_image_file("test_image.jpg", size=(150, 150))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        chunk_size = 1024
        assert file_size > chunk_size, (
            f"Image size {file_size} must be larger than chunk size {chunk_size} "
            "to properly test incremental uploads"
        )

        location = self._start_upload(task.id, file_size, "test_image.jpg")

        offset = 0

        while offset < file_size:
            chunk_end = min(offset + chunk_size, file_size)
            chunk = image_data[offset:chunk_end]

            response = self._upload_chunk(location, offset, chunk)
            assert response.status == HTTPStatus.NO_CONTENT

            new_offset = int(response.headers.get("Upload-Offset"))
            assert new_offset == chunk_end

            # Verify via HEAD only if not complete (file gets cleaned after completion)
            if new_offset < file_size:
                head_offset = self._get_upload_offset(location)
                assert head_offset == new_offset

            offset = new_offset

    def test_cannot_upload_with_wrong_offset(self, fxt_task):
        """Test that upload fails if offset doesn't match"""
        task = fxt_task

        # Generate test data (no need for valid image since upload won't complete)
        file_size = 10000
        image_data = b"\x00" * file_size

        location = self._start_upload(task.id, file_size, "test_image.jpg")

        # Upload first chunk
        chunk1 = image_data[:1000]
        response = self._upload_chunk(location, 0, chunk1)
        assert response.status == HTTPStatus.NO_CONTENT

        # Get offset from response (file is not complete yet)
        current_offset = int(response.headers.get("Upload-Offset"))
        assert current_offset == 1000

        # Try wrong offset below expected (should be 1000, we send 500)
        chunk2 = image_data[1000:2000]
        response = self._upload_chunk(location, 500, chunk2, check_status=False)
        assert response.status == HTTPStatus.CONFLICT

        # Try wrong offset above expected (should be 1000, we send 1500)
        response = self._upload_chunk(location, 1500, chunk2, check_status=False)
        assert response.status == HTTPStatus.CONFLICT

    def test_cannot_upload_chunk_exceeding_file_size(self, fxt_task):
        """Test that server rejects chunks whose end exceeds file size"""
        task = fxt_task

        # Generate test data (no need for valid image since upload won't complete)
        file_size = 10000
        image_data = b"\x00" * file_size

        location = self._start_upload(task.id, file_size, "test_image.jpg")

        chunk1 = image_data[:1000]
        response = self._upload_chunk(location, 0, chunk1)
        assert response.status == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == 1000

        # Try to upload chunk that would exceed file size
        # offset=1000, chunk size would make end_offset > file_size
        oversized_chunk = b"x" * (file_size - 500)  # This will go beyond file_size
        response = self._upload_chunk(location, 1000, oversized_chunk, check_status=False)

        assert response.status == HTTPStatus.REQUEST_ENTITY_TOO_LARGE
