# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import threading
import time
from http import HTTPStatus

import pytest
import requests

from shared.utils.config import BASE_URL, USER_PASS, make_api_client
from shared.utils.helpers import generate_image_file

try:
    from toxiproxy import Toxiproxy

    TOXIPROXY_AVAILABLE = True
except ImportError:
    TOXIPROXY_AVAILABLE = False


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestTUSUpload:
    """Integration tests for TUS resumable upload protocol"""

    _USERNAME = "admin1"

    def _create_task_via_api(self, task_spec):
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
        task = self._create_task_via_api(
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
        task = self._create_task_via_api(
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
        task = self._create_task_via_api(
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
        task = self._create_task_via_api(
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
        task = self._create_task_via_api(
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

    @pytest.mark.skipif(not TOXIPROXY_AVAILABLE, reason="toxiproxy not installed")
    def test_connection_drop_with_toxiproxy(self):
        """
        Test real connection interruption using Toxiproxy.

        Toxiproxy acts as a TCP proxy that can simulate network failures.
        This test:
        1. Routes traffic through Toxiproxy
        2. Starts uploading a chunk
        3. Toxiproxy closes connection mid-transfer
        4. Server receives only partial data
        5. Server must save what it received

        Setup required:
        - toxiproxy server running: toxiproxy-server
        - pip install toxiproxy-python
        """
        from urllib.parse import urlparse

        parsed = urlparse(BASE_URL)
        upstream_host = parsed.hostname or "localhost"
        upstream_port = parsed.port or 7000

        toxiproxy = Toxiproxy()

        try:
            proxy = toxiproxy.create(
                name="cvat_upload_test",
                listen="127.0.0.1:28474",
                upstream=f"{upstream_host}:{upstream_port}",  # Forwards to CVAT
            )
        except Exception:  # pylint: disable=broad-except
            proxy = toxiproxy.get_proxy("cvat_upload_test")
            proxy.upstream = f"{upstream_host}:{upstream_port}"

        task = self._create_task_via_api(
            {
                "name": "test toxiproxy connection drop",
                "labels": [{"name": "car"}],
            }
        )

        image_file = generate_image_file("test_image.jpg", size=(800, 800))
        image_data = image_file.getvalue()
        file_size = len(image_data)

        file_id = self._start_upload(task.id, file_size, "test_image.jpg")

        chunk_size = file_size // 2
        chunk_data = image_data[:chunk_size]

        proxy_url = f"http://127.0.0.1:28474/api/tasks/{task.id}/data/{file_id}"

        # Latency toxic to slow down upload
        proxy.add_toxic(
            name="bandwidth_limit",
            type="bandwidth",
            attributes={"rate": 50},  # 50 KB/s - very slow to ensure we can interrupt
        )

        # Function to close connection after delay
        def close_connection_after_delay(delay_sec):
            time.sleep(delay_sec)
            try:
                proxy.add_toxic(
                    name="close_connection",
                    type="reset_peer",  # Closes TCP connection
                    attributes={},
                )
            except Exception:  # pylint: disable=broad-except
                pass

        # At 50KB/s, ~300KB chunk takes ~6 seconds
        # We'll interrupt after 1 second = ~50KB transferred
        upload_delay = 1.0

        thread = threading.Thread(target=close_connection_after_delay, args=(upload_delay,))
        thread.daemon = True
        thread.start()

        # Try upload through proxy
        exception_caught = False
        try:
            response = requests.patch(
                proxy_url,
                headers={
                    "Upload-Offset": "0",
                    "Content-Type": "application/offset+octet-stream",
                    "Tus-Resumable": "1.0.0",
                    "Content-Length": str(chunk_size),
                },
                data=chunk_data,
                auth=(self._USERNAME, USER_PASS),
                timeout=5,
            )
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.ChunkedEncodingError,
        ) as e:
            exception_caught = True

        try:
            proxy.destroy_toxic("bandwidth_limit")
        except Exception:  # pylint: disable=broad-except
            pass
        try:
            proxy.destroy_toxic("close_connection")
        except Exception:  # pylint: disable=broad-except
            pass

        time.sleep(1.0)

        try:
            current_offset = self._get_upload_offset(task.id, file_id)

            # Server should have saved partial data if connection dropped
            if exception_caught:
                assert current_offset > 0, (
                    f"Server must save partial data on connection drop. "
                    f"Got offset: {current_offset}, expected > 0"
                )
                assert current_offset < chunk_size, (
                    f"Partial upload should be incomplete. "
                    f"Got offset: {current_offset}, chunk_size: {chunk_size}"
                )

            # Resume upload
            remaining_data = image_data[current_offset:]
            response = self._upload_chunk(task.id, file_id, current_offset, remaining_data)
            assert response.status_code == HTTPStatus.NO_CONTENT
            assert int(response.headers.get("Upload-Offset")) == file_size

        finally:
            try:
                toxiproxy.destroy(proxy)
            except Exception:  # pylint: disable=broad-except
                pass
