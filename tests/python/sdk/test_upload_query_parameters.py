# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import pytest

from cvat_sdk import Client
from cvat_sdk.core.uploading import TUS_CHUNK_SIZE, Uploader


@pytest.fixture
def tus_server():
    """A local HTTP peer; the generated SDK transports all requests normally."""
    state = {"starts": [], "uploads": [], "finishes": []}

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *args):
            pass

        def _body(self):
            return self.rfile.read(int(self.headers.get("Content-Length", 0)))

        def _reply(self, status, headers=None, body=b""):
            self.send_response(status)
            self.send_header("Content-Length", str(len(body)))
            for name, value in (headers or {}).items():
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            body = self._body()
            query = parse_qs(urlsplit(self.path).query)
            if "Upload-Start" in self.headers:
                state["starts"].append(query)
                self._reply(202)
            elif "Upload-Finish" in self.headers:
                state["finishes"].append({"query": query, "body": body})
                self._reply(
                    202,
                    {"Content-Type": "application/json"},
                    json.dumps({"rq_id": "import:1"}).encode(),
                )
            else:
                index = len(state["uploads"])
                metadata = {
                    key: base64.b64decode(value).decode()
                    for key, value in (
                        field.split(" ", 1)
                        for field in self.headers["Upload-Metadata"].split(",")
                    )
                }
                state["uploads"].append(
                    {
                        "length": int(self.headers["Upload-Length"]),
                        "metadata": metadata,
                        "data": bytearray(),
                        "chunks": [],
                    }
                )
                self._reply(
                    201,
                    {
                        "Upload-Filename": f"stored-{index}.bin",
                        "Location": f"{url}/uploads/{index}",
                    },
                )

        def do_PATCH(self):
            upload = state["uploads"][int(urlsplit(self.path).path.rsplit("/", 1)[-1])]
            chunk = self._body()
            if int(self.headers["Upload-Offset"]) != len(upload["data"]):
                self._reply(409, {"Upload-Offset": str(len(upload["data"]))})
                return
            upload["data"].extend(chunk)
            upload["chunks"].append(len(chunk))
            self._reply(204, {"Upload-Offset": str(len(upload["data"]))})

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    url = f"http://127.0.0.1:{server.server_port}"
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield url, state
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)


@pytest.mark.parametrize("size", [0, 17, TUS_CHUNK_SIZE + 7])
@pytest.mark.parametrize("query_kind", ["omitted", "none", "empty", "provided"])
def test_upload_finishes_with_private_optional_query_parameters(
    tmp_path, tus_server, query_kind, size
):
    url, state = tus_server
    data = (b"\x00\x01\xffCVAT" * (size // 7 + 1))[:size]
    path = tmp_path / "source.bin"
    path.write_bytes(data)
    meta = {"filename": "visible source.bin"}
    query = {"format": "CVAT 1.1", "filename": "requested.bin"} if query_kind == "provided" else {}
    before = query.copy()
    kwargs = {}
    if query_kind != "omitted":
        kwargs["query_params"] = None if query_kind == "none" else query

    with Client(url, check_server_version=False) as client:
        response = Uploader(client).upload_file(
            url + "/api/tasks/1/annotations", path, meta=meta, **kwargs
        )

    assert response.status == 202
    assert json.loads(response.data) == {"rq_id": "import:1"}
    assert state["starts"] == [{key: [value] for key, value in before.items()}]
    assert len(state["uploads"]) == 1
    upload = state["uploads"][0]
    assert upload["length"] == size
    assert bytes(upload["data"]) == data
    assert upload["metadata"] == meta
    assert upload["chunks"] == ([TUS_CHUNK_SIZE, 7] if size > TUS_CHUNK_SIZE else [size])
    expected_finish = {key: [value] for key, value in before.items()}
    expected_finish["filename"] = ["stored-0.bin"]
    assert [finish["query"] for finish in state["finishes"]] == [expected_finish]
    assert query == before
    assert meta == {"filename": "visible source.bin"}


def test_query_parameters_can_be_reused_for_multiple_uploads(tmp_path, tus_server):
    url, state = tus_server
    query = {"format": "CVAT 1.1", "filename": "visible.bin"}
    original = query.copy()
    with Client(url, check_server_version=False) as client:
        uploader = Uploader(client)
        for index in range(2):
            path = tmp_path / f"source-{index}.bin"
            path.write_bytes(bytes([index, 255]))
            uploader.upload_file(
                url + "/api/tasks/1/annotations",
                path,
                meta={"filename": path.name},
                query_params=query,
            )

    assert state["starts"] == [{key: [value] for key, value in original.items()}] * 2
    assert [item["query"]["filename"] for item in state["finishes"]] == [
        ["stored-0.bin"],
        ["stored-1.bin"],
    ]
    assert [bytes(upload["data"]) for upload in state["uploads"]] == [b"\x00\xff", b"\x01\xff"]
    assert query == original
