# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
from http import HTTPStatus

import pytest
import requests

from shared.utils.config import BASE_URL, USER_PASS, make_api_client
from shared.utils.helpers import generate_image_file


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestTUSUpload:
    """Integration tests for TUS resumable upload protocol"""

    _USERNAME = "admin1"

    def _create_task(self, task_spec):
        """Helper to create a task"""
        with make_api_client(self._USERNAME) as api_client:
            (task, response) = api_client.tasks_api.create(task_spec)
            assert response.status == HTTPStatus.CREATED
            return task

    def _start_upload(self, task_id, file_size, filename):
        """Start TUS upload and return file_id"""
        metadata = f"filename {base64.b64encode(filename.encode()).decode()}"

        response = requests.post(
            f"{BASE_URL}/api/tasks/{task_id}/data",
            headers={
                "Upload-Length": str(file_size),
                "Upload-Metadata": metadata,
                "Tus-Resumable": "1.0.0",
            },
            auth=(self._USERNAME, USER_PASS),
        )

        assert response.status_code == HTTPStatus.CREATED
        location = response.headers.get("Location")
        assert location is not None
        file_id = location.split("/")[-1]
        return file_id

    def _upload_chunk(self, task_id, file_id, offset, data):
        """Upload a chunk via TUS PATCH request"""
        response = requests.patch(
            f"{BASE_URL}/api/tasks/{task_id}/data/{file_id}",
            headers={
                "Upload-Offset": str(offset),
                "Content-Type": "application/offset+octet-stream",
                "Tus-Resumable": "1.0.0",
            },
            data=data,
            auth=(self._USERNAME, USER_PASS),
        )
        return response

    def _get_upload_offset(self, task_id, file_id):
        """Get current upload offset via TUS HEAD request"""
        response = requests.head(
            f"{BASE_URL}/api/tasks/{task_id}/data/{file_id}",
            headers={"Tus-Resumable": "1.0.0"},
            auth=(self._USERNAME, USER_PASS),
        )
        assert response.status_code == HTTPStatus.OK
        offset = response.headers.get("Upload-Offset")
        assert offset is not None
        return int(offset)

    def test_can_upload_file_via_tus_in_single_chunk(self):
        """Test uploading a complete file in one chunk"""
        task = self._create_task(
            {
                "name": "test TUS single chunk upload",
                "labels": [{"name": "car"}],
            }
        )

        image_file = generate_image_file("test_image.jpg", size=(100, 100))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")
        response = self._upload_chunk(task.id, file_id, 0, image_data)

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == file_size

    def test_can_upload_file_via_tus_in_multiple_chunks(self):
        """Test uploading a file in multiple chunks"""
        task = self._create_task(
            {
                "name": "test TUS multiple chunks upload",
                "labels": [{"name": "car"}],
            }
        )

        image_file = generate_image_file("test_image.jpg", size=(200, 200))
        image_data = image_file.getvalue()
        file_size = len(image_data)
        chunk_size = file_size // 3

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")

        # Upload first chunk
        chunk1 = image_data[:chunk_size]
        response = self._upload_chunk(task.id, file_id, 0, chunk1)
        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == len(chunk1)

        # Upload second chunk
        chunk2 = image_data[chunk_size : 2 * chunk_size]
        response = self._upload_chunk(task.id, file_id, len(chunk1), chunk2)
        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == len(chunk1) + len(chunk2)

        # Upload final chunk
        chunk3 = image_data[2 * chunk_size :]
        response = self._upload_chunk(task.id, file_id, len(chunk1) + len(chunk2), chunk3)
        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == file_size

    def test_can_resume_fake_interrupted_upload(self):
        """Test that interrupted uploads can be resumed (KEY TEST for issue #5261)"""
        task = self._create_task(
            {
                "name": "test TUS resume interrupted upload",
                "labels": [{"name": "car"}],
            }
        )

        image_file = generate_image_file("test_image.jpg", size=(200, 200))
        image_data = image_file.getvalue()
        file_size = len(image_data)
        first_chunk_size = int(file_size * 0.4)

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")

        # Upload 40% of file
        chunk1 = image_data[:first_chunk_size]
        response = self._upload_chunk(task.id, file_id, 0, chunk1)
        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == first_chunk_size

        # Simulate interruption - check current offset
        current_offset = self._get_upload_offset(task.id, file_id)
        assert current_offset == first_chunk_size

        # Resume from where we left off
        chunk2 = image_data[first_chunk_size:]
        response = self._upload_chunk(task.id, file_id, current_offset, chunk2)
        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == file_size

    def test_upload_offset_is_updated_incrementally(self):
        """Test offset updates correctly after each small chunk"""
        task = self._create_task(
            {
                "name": "test TUS incremental offset",
                "labels": [{"name": "car"}],
            }
        )

        image_file = generate_image_file("test_image.jpg", size=(150, 150))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")

        chunk_size = 1024
        offset = 0

        while offset < file_size:
            chunk_end = min(offset + chunk_size, file_size)
            chunk = image_data[offset:chunk_end]

            response = self._upload_chunk(task.id, file_id, offset, chunk)
            assert response.status_code == HTTPStatus.NO_CONTENT

            new_offset = int(response.headers.get("Upload-Offset"))
            assert new_offset == chunk_end

            # Verify via HEAD only if not complete (file gets cleaned after completion)
            if new_offset < file_size:
                head_offset = self._get_upload_offset(task.id, file_id)
                assert head_offset == new_offset

            offset = new_offset

    def test_cannot_upload_with_wrong_offset(self):
        """Test that upload fails if offset doesn't match"""
        task = self._create_task(
            {
                "name": "test TUS wrong offset",
                "labels": [{"name": "car"}],
            }
        )

        # Generate larger image to ensure multiple chunks needed
        image_file = generate_image_file("test_image.jpg", size=(200, 200))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")

        # Upload first chunk
        chunk1 = image_data[:1000]
        response = self._upload_chunk(task.id, file_id, 0, chunk1)
        assert response.status_code == HTTPStatus.NO_CONTENT

        # Get offset from response (file is not complete yet)
        current_offset = int(response.headers.get("Upload-Offset"))
        assert current_offset == 1000

        # Try wrong offset (should be 1000, we send 500)
        chunk2 = image_data[1000:2000]
        response = self._upload_chunk(task.id, file_id, 500, chunk2)
        assert response.status_code in (HTTPStatus.CONFLICT, HTTPStatus.INTERNAL_SERVER_ERROR)

    def test_cannot_upload_chunk_exceeding_file_size(self):
        """Test that server rejects chunks whose end exceeds file size"""
        task = self._create_task(
            {
                "name": "test TUS chunk exceeds file size",
                "labels": [{"name": "car"}],
            }
        )

        image_file = generate_image_file("test_image.jpg", size=(200, 200))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")

        chunk1 = image_data[:1000]
        response = self._upload_chunk(task.id, file_id, 0, chunk1)
        assert response.status_code == HTTPStatus.NO_CONTENT
        assert int(response.headers.get("Upload-Offset")) == 1000

        # Try to upload chunk that would exceed file size
        # offset=1000, chunk size would make end_offset > file_size
        oversized_chunk = b"x" * (file_size - 500)  # This will go beyond file_size
        response = self._upload_chunk(task.id, file_id, 1000, oversized_chunk)

        assert (
            response.status_code == HTTPStatus.REQUEST_ENTITY_TOO_LARGE
        ), f"Expected 413 when chunk end exceeds file size, got {response.status_code}"
