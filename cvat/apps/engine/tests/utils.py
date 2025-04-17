# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import logging
import os
import shutil
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
from typing import Any, Callable, TypeVar
from urllib.parse import urlencode

import av
import django_rq
import numpy as np
from django.conf import settings
from django.core.cache import caches
from django.http.response import HttpResponse
from PIL import Image
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APITestCase

T = TypeVar('T')


@contextmanager
def logging_disabled():
    old_level = logging.getLogger().manager.disable

    try:
        logging.disable(logging.CRITICAL)
        yield
    finally:
        logging.disable(old_level)


class ForceLogin:
    def __init__(self, user, client):
        self.user = user
        self.client = client

    def __enter__(self):
        if self.user:
            self.client.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()


def clear_rq_jobs():
    for queue_name in settings.RQ_QUEUES:
        queue = django_rq.get_queue(queue_name)

        # Remove actual jobs
        queue.empty()

        # Clean up the registries
        for registry in [
            queue.failed_job_registry,
            queue.finished_job_registry,
            queue.started_job_registry,
            queue.scheduled_job_registry,
        ]:
            for job_id in registry.get_job_ids():
                registry.remove(job_id)

        # Remove orphaned jobs that can't be normally reported by DjangoRQ
        # https://github.com/rq/django-rq/issues/73
        for key in queue.connection.keys('rq:job:*'):
            job_id = key.decode().split('rq:job:', maxsplit=1)[1]
            job = queue.fetch_job(job_id)
            if not job:
                # The job can belong to a different queue, using the same connection
                continue

            job.delete()

        # Clean up the scheduler, if any
        try:
            scheduler = django_rq.get_scheduler(queue_name, queue)
        except ImportError:
            # If the scheduler is not enabled, an exception is thrown
            continue

        try:
            scheduler.acquire_lock()
            for job in scheduler.get_jobs():
                scheduler.cancel(job)
        finally:
            scheduler.remove_lock()


class ApiTestBase(APITestCase):
    def _clear_temp_data(self):
        # Clear server frame/chunk cache.
        # The parent class clears DB changes, and it can lead to under-cleaned task data,
        # which can affect other tests.
        # This situation is not expected to happen on a real server, because
        # cache keys include Data object ids, which cannot be reused or freed
        # in real scenarios
        for cache in caches.all(initialized_only=True):
            cache.clear()

        # Clear any remaining RQ jobs produced by the tests executed
        self._clear_rq_jobs()

        # clear cache files created after previous exports
        export_cache_dir = Path(settings.EXPORT_CACHE_ROOT)
        for child in export_cache_dir.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                os.remove(child)

    def _clear_rq_jobs(self):
        clear_rq_jobs()

    def setUp(self):
        self._clear_temp_data()

        super().setUp()
        self.client = self.client_class()

    def _get_request(self, path: str, user: str, *, query_params: dict[str, Any] | None = None) -> Response:
        with ForceLogin(user, self.client):
            response = self.client.get(path, data=query_params)
        return response

    def _delete_request(self, path: str, user: str):
        with ForceLogin(user, self.client):
            response = self.client.delete(path)
        return response

    def _post_request(
        self,
        path: str,
        user: str,
        *,
        format: str = "json",  # pylint: disable=redefined-builtin
        query_params: dict[str, Any] = None,
        data: dict[str, Any] | None = None
    ):
        if query_params:
            # Note: once we upgrade to Django 5.1+, this should be changed to pass query_params
            # directly to self.client.
            assert "?" not in path
            path += "?" + urlencode(query_params)
        with ForceLogin(user, self.client):
            response = self.client.post(path, data=data, format=format)
        return response

    def _patch_request(self, path: str, user: str, *, data: dict[str, Any] | None = None):
        with ForceLogin(user, self.client):
            response = self.client.patch(path, data=data, format="json")
        return response

    def _put_request(
        self,
        url: str,
        user: str,
        *,
        format: str = "json",  # pylint: disable=redefined-builtin
        data: dict[str, Any] | None = None,
    ):
        with ForceLogin(user, self.client):
            response = self.client.put(url, data=data, format=format)
        return response

    def _check_request_status(
        self,
        user: str,
        rq_id: str,
        *,
        expected_4xx_status_code: int | None = None,
    ):
        response = self._get_request(f"/api/requests/{rq_id}", user)
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_200_OK)
        if expected_4xx_status_code is not None:
            return

        request_status = response.json()["status"]
        assert request_status == "finished", f"The last request status was {request_status}"
        return response


class ExportApiTestBase(ApiTestBase):
    def _export(
        self,
        user: str,
        api_path: str,
        *,
        query_params: dict[str, Any] | None = None,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        response = self._post_request(api_path, user, query_params=query_params)
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_202_ACCEPTED)

        rq_id = response.json().get("rq_id")
        if expected_4xx_status_code:
            # export task by admin to get real rq_id
            response = self._post_request(api_path, self.admin, query_params=query_params)
            self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
            rq_id = response.json().get("rq_id")

        assert rq_id, "The rq_id param was not found in the server response"

        response = self._check_request_status(user, rq_id, expected_4xx_status_code=expected_4xx_status_code)

        if not download_locally:
            return response

        # get actual result URL to check that server returns 401/403 when a user tries to download prepared file
        if expected_4xx_status_code:
            response = self._check_request_status(self.admin, rq_id)

        result_url = response.json().get("result_url")
        assert result_url, "The result_url param was not found in the server response"

        response = self._get_request(result_url, user)
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_200_OK)

        if not expected_4xx_status_code and file_path:
            with open(file_path, "wb") as f:
                f.write(response.getvalue())

        return response

    def _export_task_backup(
        self,
        user: str,
        task_id: int,
        *,
        query_params: dict | None = None,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._export(
            user, f"/api/tasks/{task_id}/backup/export",
            query_params=query_params,
            download_locally=download_locally, file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_project_backup(
        self,
        user: str,
        project_id: int,
        *,
        query_params: dict | None = None,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._export(
            user, f"/api/projects/{project_id}/backup/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_project_dataset(
        self,
        user: str,
        project_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = True

        return self._export(
            user, f"/api/projects/{project_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_project_annotations(
        self,
        user: str,
        project_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = False

        return self._export(
            user, f"/api/projects/{project_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_task_dataset(
        self,
        user: str,
        task_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = True

        return self._export(
            user, f"/api/tasks/{task_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_task_annotations(
        self,
        user: str,
        task_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = False

        return self._export(
            user, f"/api/tasks/{task_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_job_dataset(
        self,
        user: str,
        job_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = True

        return self._export(
            user, f"/api/jobs/{job_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

    def _export_job_annotations(
        self,
        user: str,
        job_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = False

        return self._export(
            user, f"/api/jobs/{job_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code
        )

def generate_image_file(filename, size=(100, 100)):
    assert os.path.splitext(filename)[-1].lower() in ['', '.jpg', '.jpeg'], \
        "This function supports only jpeg images. Please add the .jpg extension to the file name"

    f = BytesIO()
    image = Image.new('RGB', size=size)
    image.save(f, 'jpeg')
    f.name = filename
    f.seek(0)
    return f


def generate_video_file(filename, width=1920, height=1080, duration=1, fps=25, codec_name='mpeg4'):
    f = BytesIO()
    total_frames = duration * fps
    file_ext = os.path.splitext(filename)[1][1:]
    container = av.open(f, mode='w', format=file_ext)

    stream = container.add_stream(codec_name=codec_name, rate=fps)
    stream.width = width
    stream.height = height
    stream.pix_fmt = 'yuv420p'

    for frame_i in range(total_frames):
        img = np.empty((stream.width, stream.height, 3))
        img[:, :, 0] = 0.5 + 0.5 * np.sin(2 * np.pi * (0 / 3 + frame_i / total_frames))
        img[:, :, 1] = 0.5 + 0.5 * np.sin(2 * np.pi * (1 / 3 + frame_i / total_frames))
        img[:, :, 2] = 0.5 + 0.5 * np.sin(2 * np.pi * (2 / 3 + frame_i / total_frames))

        img = np.round(255 * img).astype(np.uint8)
        img = np.clip(img, 0, 255)

        frame = av.VideoFrame.from_ndarray(img, format='rgb24')
        for packet in stream.encode(frame):
            container.mux(packet)

    # Flush stream
    for packet in stream.encode():
        container.mux(packet)

    # Close the file
    container.close()
    f.name = filename
    f.seek(0)

    return [(width, height)] * total_frames, f

def get_paginated_collection(
    request_chunk_callback: Callable[[int], HttpResponse]
) -> Iterator[T]:
    values = []

    for page in itertools.count(start=1):
        response = request_chunk_callback(page)
        data = response.json()
        values.extend(data["results"])
        if not data.get('next'):
            break

    return values


def filter_dict(
    d: dict[str, Any], *, keep: Sequence[str] = None, drop: Sequence[str] = None
) -> dict[str, Any]:
    return {k: v for k, v in d.items() if (not keep or k in keep) and (not drop or k not in drop)}
