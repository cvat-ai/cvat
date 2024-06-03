# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager
from io import BytesIO
from typing import Any, Callable, Dict, Iterator, Sequence, TypeVar
import itertools
import logging
import os

from django.conf import settings
from django.core.cache import caches
from django.http.response import HttpResponse
from PIL import Image
from rest_framework.test import APIClient, APITestCase
import av
import django_rq
import numpy as np

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
    def _clear_rq_jobs(self):
        clear_rq_jobs()

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def tearDown(self):
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

        return super().tearDown()


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
    d: Dict[str, Any], *, keep: Sequence[str] = None, drop: Sequence[str] = None
) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if (not keep or k in keep) and (not drop or k not in drop)}
