# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import contextlib
import http.server
import ssl
import textwrap
import threading
from collections.abc import Container, Generator
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pytest
import requests
from cvat_sdk.api_client.rest import RESTClientObject
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter

from shared.utils.config import BASE_URL


def make_pbar(file, **kwargs):
    return DeferredTqdmProgressReporter({"file": file, "mininterval": 0, **kwargs})


def generate_coco_json(filename: Path, img_info: tuple[Path, int, int]):
    image_filename, image_width, image_height = img_info

    content = generate_coco_anno(
        image_filename.name,
        image_width=image_width,
        image_height=image_height,
    )
    with open(filename, "w") as coco:
        coco.write(content)


def generate_coco_anno(image_path: str, image_width: int, image_height: int) -> str:
    return (
        textwrap.dedent("""
    {
        "categories": [
            {
                "id": 1,
                "name": "car",
                "supercategory": ""
            },
            {
                "id": 2,
                "name": "person",
                "supercategory": ""
            }
        ],
        "images": [
            {
                "coco_url": "",
                "date_captured": "",
                "flickr_url": "",
                "license": 0,
                "id": 0,
                "file_name": "%(image_path)s",
                "height": %(image_height)d,
                "width": %(image_width)d
            }
        ],
        "annotations": [
            {
                "category_id": 1,
                "id": 1,
                "image_id": 0,
                "iscrowd": 0,
                "segmentation": [
                    []
                ],
                "area": 17702.0,
                "bbox": [
                    574.0,
                    407.0,
                    167.0,
                    106.0
                ]
            }
        ]
    }
    """)
        % {
            "image_path": image_path,
            "image_height": image_height,
            "image_width": image_width,
        }
    )


def restrict_api_requests(
    monkeypatch: pytest.MonkeyPatch, allow_paths: Container[str] = ()
) -> None:
    original_request = RESTClientObject.request

    def restricted_request(self, method, url, *args, **kwargs):
        parsed_url = urlparse(url)
        if parsed_url.path in allow_paths:
            return original_request(self, method, url, *args, **kwargs)
        raise RuntimeError("Disallowed!")

    monkeypatch.setattr(RESTClientObject, "request", restricted_request)


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
