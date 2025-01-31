# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import contextlib
import http.server
import io
import ssl
import threading
import unittest
from collections.abc import Generator
from pathlib import Path
from typing import Any, Optional, Union

import pytest
import requests
from cvat_sdk import make_client

from shared.utils.config import BASE_URL, USER_PASS
from shared.utils.helpers import generate_image_file


def run_cli(test: Union[unittest.TestCase, Any], *args: str, expected_code: int = 0) -> None:
    from cvat_cli.__main__ import main

    if isinstance(test, unittest.TestCase):
        # Unittest
        test.assertEqual(expected_code, main(args), str(args))
    else:
        # Pytest case
        assert expected_code == main(args)


def generate_images(dst_dir: Path, count: int) -> list[Path]:
    filenames = []
    dst_dir.mkdir(parents=True, exist_ok=True)
    for i in range(count):
        filename = dst_dir / f"img_{i}.jpg"
        filename.write_bytes(generate_image_file(filename.name).getvalue())
        filenames.append(filename)
    return filenames


@contextlib.contextmanager
def https_reverse_proxy() -> Generator[str, None, None]:
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
    cert_dir = Path(__file__).parent
    ssl_context.load_cert_chain(cert_dir / "self-signed.crt", cert_dir / "self-signed.key")

    with http.server.HTTPServer(("localhost", 0), _ProxyHttpRequestHandler) as proxy_server:
        proxy_server.socket = ssl_context.wrap_socket(
            proxy_server.socket,
            server_side=True,
        )
        server_thread = threading.Thread(target=proxy_server.serve_forever)
        server_thread.start()
        try:
            yield f"https://localhost:{proxy_server.server_port}"
        finally:
            proxy_server.shutdown()
            server_thread.join()


class _ProxyHttpRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        response = requests.get(**self._shared_request_args())
        self._translate_response(response)

    def do_POST(self):
        body_length = int(self.headers["Content-Length"])

        response = requests.post(data=self.rfile.read(body_length), **self._shared_request_args())
        self._translate_response(response)

    def _shared_request_args(self) -> dict[str, Any]:
        headers = {k.lower(): v for k, v in self.headers.items()}
        del headers["host"]

        return {"url": BASE_URL + self.path, "headers": headers, "timeout": 60, "stream": True}

    def _translate_response(self, response: requests.Response) -> None:
        self.send_response(response.status_code)
        for key, value in response.headers.items():
            self.send_header(key, value)
        self.end_headers()
        # Need to use raw here to prevent requests from handling Content-Encoding.
        self.wfile.write(response.raw.read())


class TestCliBase:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_function,  # force fixture call order to allow DB setup
        restore_redis_inmem_per_function,
        restore_redis_ondisk_per_function,
        fxt_stdout: io.StringIO,
        tmp_path: Path,
        admin_user: str,
    ):
        self.tmp_path = tmp_path
        self.stdout = fxt_stdout
        self.host, self.port = BASE_URL.rsplit(":", maxsplit=1)
        self.user = admin_user
        self.password = USER_PASS
        self.client = make_client(
            host=self.host, port=self.port, credentials=(self.user, self.password)
        )
        self.client.config.status_check_period = 0.01

        yield

    def run_cli(
        self, cmd: str, *args: str, expected_code: int = 0, organization: Optional[str] = None
    ) -> str:
        common_args = [
            f"--auth={self.user}:{self.password}",
            f"--server-host={self.host}",
            f"--server-port={self.port}",
        ]

        if organization is not None:
            common_args.append(f"--organization={organization}")

        run_cli(
            self,
            *common_args,
            cmd,
            *args,
            expected_code=expected_code,
        )
        return self.stdout.getvalue()
