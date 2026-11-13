# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import gzip
import hashlib
import io
import json
import threading
import zipfile
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import urllib3

from cvat_sdk import Client
from cvat_sdk.core.downloading import Downloader
from cvat_sdk.core.progress import NullProgressReporter


class RecordingProgress(NullProgressReporter):
    def start2(self, total, **kwargs):
        super().start2(total, **kwargs)
        self.total = total
        self.completed = 0

    def advance(self, delta):
        super().advance(delta)
        self.completed += delta


@pytest.fixture
def download_server():
    state = {}

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *args):
            pass

        def do_GET(self):
            state["accept_encoding"] = self.headers.get("Accept-Encoding")
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", 'attachment; filename="dataset.zip"')
            if state.get("encoding"):
                self.send_header("Content-Encoding", state["encoding"])
            body = state["body"]
            if state.get("chunked"):
                self.send_header("Transfer-Encoding", "chunked")
            else:
                self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if state.get("chunked"):
                for start in range(0, len(body), 113):
                    chunk = body[start : start + 113]
                    self.wfile.write(f"{len(chunk):x}\r\n".encode() + chunk + b"\r\n")
                self.wfile.write(b"0\r\n\r\n")
            else:
                self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/dataset", state
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)


def _archive():
    raw = io.BytesIO()
    annotations = [{"id": index, "text": "training example"} for index in range(100)]
    with zipfile.ZipFile(raw, "w", compression=zipfile.ZIP_STORED) as archive:
        archive.writestr("annotations.json", json.dumps(annotations))
    return raw.getvalue(), annotations


def _download(url, output, progress=None):
    with Client(url.rsplit("/", 1)[0], check_server_version=False) as client:
        client.api_client.default_headers["Accept-Encoding"] = "gzip, deflate"
        return Downloader(client).download_file(url, output, pbar=progress)


@pytest.mark.parametrize("encoding", [None, "identity", "gzip", "deflate"])
@pytest.mark.parametrize("chunked", [False, True])
@pytest.mark.parametrize("target", ["file", "directory"])
def test_download_decodes_http_encoding_and_keeps_archive_bytes(
    tmp_path, download_server, encoding, chunked, target
):
    url, state = download_server
    expected, annotations = _archive()
    state["body"] = (
        gzip.compress(expected)
        if encoding == "gzip"
        else zlib.compress(expected) if encoding == "deflate" else expected
    )
    state.update(encoding=encoding, chunked=chunked)
    output = tmp_path if target == "directory" else tmp_path / "explicit.zip"
    progress = RecordingProgress()

    result = _download(url, output, progress)

    assert result == tmp_path / ("dataset.zip" if target == "directory" else "explicit.zip")
    assert result.read_bytes() == expected
    with zipfile.ZipFile(result) as archive:
        assert json.loads(archive.read("annotations.json")) == annotations
    assert state["accept_encoding"] == "gzip, deflate"
    assert progress.completed == len(expected)
    expected_total = None if encoding in ("gzip", "deflate") else (0 if chunked else len(expected))
    assert progress.total == expected_total


def test_intrinsically_gzipped_file_is_not_decoded_without_content_encoding(tmp_path, download_server):
    url, state = download_server
    expected = gzip.compress(b"annotation file content")
    state["body"] = expected
    output = tmp_path / "annotations.gz"

    assert _download(url, output).read_bytes() == expected
    assert gzip.decompress(output.read_bytes()) == b"annotation file content"


@pytest.mark.parametrize("encoding", ["gzip", "deflate"])
def test_decoded_content_spans_multiple_download_reads(tmp_path, download_server, encoding):
    url, state = download_server
    expected = b"CVAT training data\n" * 700000
    state["encoding"] = encoding
    state["body"] = gzip.compress(expected) if encoding == "gzip" else zlib.compress(expected)
    progress = RecordingProgress()

    actual = _download(url, tmp_path / "large.txt", progress).read_bytes()
    assert len(actual) == len(expected)
    assert hashlib.sha256(actual).digest() == hashlib.sha256(expected).digest()
    assert progress.completed == len(expected)
    assert progress.total is None


def test_malformed_http_encoding_does_not_leave_a_completed_download(tmp_path, download_server):
    url, state = download_server
    state.update(encoding="gzip", body=b"not a gzip stream")
    output = tmp_path / "broken.zip"

    with pytest.raises(urllib3.exceptions.DecodeError):
        _download(url, output)

    assert not output.exists()
    assert list(tmp_path.iterdir()) == []
