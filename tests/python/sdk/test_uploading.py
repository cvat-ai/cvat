# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import logging
from types import SimpleNamespace

import pytest
import urllib3
from cvat_sdk.api_client.exceptions import ApiException
from cvat_sdk.core import uploading
from cvat_sdk.core.exceptions import CvatSdkException


class UploadServer:
    def __init__(self, failures, *, accept_failed_chunks, error_status=None, partial=False):
        self.failures = set(failures)
        self.accept_failed_chunks = accept_failed_chunks
        self.offset = 0
        self.calls = 0
        self.data = bytearray()
        self.error_status = error_status
        self.partial = partial

    def POST(self, *args, **kwargs):
        if "Upload-Start" in kwargs.get("headers", {}):
            return SimpleNamespace(status=202)
        if "Upload-Finish" in kwargs.get("headers", {}):
            self.finish_params = kwargs["query_params"].copy()
            return SimpleNamespace(status=202)
        return SimpleNamespace(headers={"Upload-Filename": "file", "Location": "/upload/1"})

    def PATCH(self, *args, **kwargs):
        self.calls += 1
        assert int(kwargs["headers"]["Upload-Offset"]) == self.offset
        if self.calls in self.failures:
            if self.accept_failed_chunks:
                accepted = kwargs["body"][:1] if self.partial else kwargs["body"]
                self.offset += len(accepted)
                self.data.extend(accepted)
            if self.error_status is not None:
                raise ApiException(status=self.error_status)
            raise urllib3.exceptions.ProtocolError("response lost")
        self.offset += len(kwargs["body"])
        self.data.extend(kwargs["body"])
        return SimpleNamespace(headers={"Upload-Offset": str(self.offset)})

    def HEAD(self, *args, **kwargs):
        return SimpleNamespace(headers={"Upload-Offset": str(self.offset)})


@pytest.mark.parametrize("failures", [(), (1, 3, 5), (3, 4, 5)])
def test_tus_completes_after_lost_responses(monkeypatch, failures):
    server = UploadServer(failures, accept_failed_chunks=True)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 1)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    result = uploading._upload_with_tus(
        SimpleNamespace(rest_client=server),
        "/upload",
        {"filename": "file"},
        io.BytesIO(b"abcde"),
        logging.getLogger(__name__),
    )
    assert result == "file"
    assert server.offset == 5
    assert server.calls == 5
    assert server.data == b"abcde"


def test_tus_stops_after_repeated_errors_without_progress(monkeypatch):
    server = UploadServer((1, 2, 3), accept_failed_chunks=False)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 1)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    with pytest.raises(CvatSdkException, match="Too many upload errors"):
        uploading._upload_with_tus(
            SimpleNamespace(rest_client=server),
            "/upload",
            {"filename": "file"},
            io.BytesIO(b"abcde"),
            logging.getLogger(__name__),
        )
    assert server.calls == 3
    assert server.offset == 0


def test_tus_success_resets_retry_budget(monkeypatch):
    server = UploadServer((1, 2, 4, 5), accept_failed_chunks=False)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 1)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    assert (
        uploading._upload_with_tus(
            SimpleNamespace(rest_client=server),
            "/upload",
            {"filename": "file"},
            io.BytesIO(b"ab"),
            logging.getLogger(__name__),
        )
        == "file"
    )
    assert server.data == b"ab"
    assert server.calls == 6


def test_tus_resumes_after_partial_chunk_writes(monkeypatch):
    server = UploadServer((1, 2, 3), accept_failed_chunks=True, partial=True)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 2)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    assert (
        uploading._upload_with_tus(
            SimpleNamespace(rest_client=server),
            "/upload",
            {"filename": "file"},
            io.BytesIO(b"abcde"),
            logging.getLogger(__name__),
        )
        == "file"
    )
    assert server.data == b"abcde"


@pytest.mark.parametrize("status", [409, 500])
def test_tus_recovers_from_http_errors_after_progress(monkeypatch, status):
    server = UploadServer((1, 3, 5), accept_failed_chunks=True, error_status=status)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 1)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    assert (
        uploading._upload_with_tus(
            SimpleNamespace(rest_client=server),
            "/upload",
            {"filename": "file"},
            io.BytesIO(b"abcde"),
            logging.getLogger(__name__),
        )
        == "file"
    )
    assert server.data == b"abcde"


def test_tus_does_not_retry_forbidden_response(monkeypatch):
    server = UploadServer((1,), accept_failed_chunks=False, error_status=403)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 1)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    with pytest.raises(ApiException) as error:
        uploading._upload_with_tus(
            SimpleNamespace(rest_client=server),
            "/upload",
            {"filename": "file"},
            io.BytesIO(b"abcde"),
            logging.getLogger(__name__),
        )
    assert error.value.status == 403
    assert server.calls == 1


def test_upload_file_finishes_after_lost_chunk_responses(monkeypatch, tmp_path):
    server = UploadServer((1, 3, 5), accept_failed_chunks=True)
    monkeypatch.setattr(uploading, "TUS_CHUNK_SIZE", 1)
    monkeypatch.setattr(uploading, "make_request_headers", lambda _: {})
    client = SimpleNamespace(
        api_client=SimpleNamespace(rest_client=server), logger=logging.getLogger(__name__)
    )
    filename = tmp_path / "example.bin"
    filename.write_bytes(b"abcde")

    response = uploading.Uploader(client).upload_file(
        "/upload", filename, meta={"filename": filename.name}, query_params={}
    )

    assert response.status == 202
    assert server.offset == 5
    assert server.finish_params == {"filename": "file"}
