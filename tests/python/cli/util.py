# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import contextlib
import http.server
import ssl
import threading
import unittest
from collections.abc import Generator
from pathlib import Path
from typing import Any, Union

import requests

from shared.utils.config import BASE_URL
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
