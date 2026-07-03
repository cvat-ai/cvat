# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import tempfile
from pathlib import Path

from django_sendfile.utils import _get_sendfile
from django.test import RequestFactory, SimpleTestCase

from cvat.apps.engine.utils import sendfile


class TestSendfile(SimpleTestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)

        self.root = Path(tmp.name).resolve()
        self.file = self.root / "export.zip"
        self.payload = b"cvat-export-payload"
        self.file.write_bytes(self.payload)

        self.request = RequestFactory().get("/api/tasks/1/dataset")

        # The chosen sendfile backend is memoized, so it must be reset whenever
        # the SENDFILE_BACKEND setting is overridden below.
        _get_sendfile.cache_clear()
        self.addCleanup(_get_sendfile.cache_clear)

    def _sendfile(self):
        return sendfile(
            self.request,
            str(self.file),
            attachment=True,
            attachment_filename="export.zip",
        )

    def test_nginx_backend_drops_content_length(self):
        # The nginx (X-Accel-Redirect) backend returns an empty body, but
        # django-sendfile2 still sets Content-Length to the file size. Under ASGI
        # (uvicorn) that raises "Response content shorter than Content-Length" on
        # every download. The wrapper must drop the header so the front web server
        # can set the real one when it serves the offloaded file.
        with self.settings(
            SENDFILE_BACKEND="django_sendfile.backends.nginx",
            SENDFILE_ROOT=str(self.root),
            SENDFILE_URL="/data",
        ):
            response = self._sendfile()

        self.assertTrue(response.has_header("X-Accel-Redirect"))
        self.assertFalse(response.has_header("Content-Length"))

    def test_streaming_backend_keeps_content_length(self):
        # The streaming/development backend sends the real body itself, so the
        # matching Content-Length must be preserved.
        with self.settings(
            SENDFILE_BACKEND="django_sendfile.backends.development",
            SENDFILE_ROOT=str(self.root),
            SENDFILE_URL="/data",
        ):
            response = self._sendfile()

        self.assertFalse(response.has_header("X-Accel-Redirect"))
        self.assertEqual(response["Content-Length"], str(len(self.payload)))
