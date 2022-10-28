# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager
from io import BytesIO
import logging
import os
import shutil

from django.conf import settings
from PIL import Image
from rest_framework.test import APIClient, APITestCase
import av
import numpy as np


@contextmanager
def disable_logging():
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


class ApiTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def tearDown(self):
        # Clear server frame/chunk cache.
        # The parent class clears DB changes, and it can lead to under-cleaned task data,
        # which can affect other tests.
        # This situation is not expected to happen on a real server, because
        # cache keys include Data object ids, which cannot be reused or freed.

        server_frame_cache_dir = settings.CACHE_ROOT
        if os.path.isdir(server_frame_cache_dir):
            shutil.rmtree(server_frame_cache_dir)
        return super().tearDown()


def generate_image_file(filename, size=(100, 100)):
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
