# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from cvat_sdk.core.progress import NullProgressReporter
from cvat_sdk.core.proxies.jobs import Job
from cvat_sdk.core.proxies.tasks import Task
from cvat_sdk.core.uploading import AnnotationUploader


@pytest.mark.parametrize("proxy_cls", [Task, Job])
def test_import_annotations_passes_import_mode_to_uploader(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, proxy_cls
):
    annotation_file = tmp_path / "annotations.zip"
    annotation_file.write_bytes(b"test")
    endpoint = SimpleNamespace(path="/api/annotations/")
    captured = {}

    def upload_file_and_wait(self, endpoint_arg, filename_arg, format_name_arg, **kwargs):
        captured["endpoint"] = endpoint_arg
        captured["filename"] = filename_arg
        captured["format_name"] = format_name_arg
        captured["kwargs"] = kwargs

    monkeypatch.setattr(AnnotationUploader, "upload_file_and_wait", upload_file_and_wait)

    proxy = SimpleNamespace(
        id=123,
        api=SimpleNamespace(create_annotations_endpoint=endpoint),
        _client=SimpleNamespace(logger=SimpleNamespace(info=lambda *args, **kwargs: None)),
    )

    proxy_cls.import_annotations(proxy, "CVAT 1.1", annotation_file, import_mode="append")

    assert captured["endpoint"] is endpoint
    assert captured["filename"] == annotation_file
    assert captured["format_name"] == "CVAT 1.1"
    assert captured["kwargs"]["import_mode"] == "append"
    assert captured["kwargs"]["url_params"] == {"id": 123}


def test_annotation_uploader_sends_import_mode_as_query_param(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    annotation_file = tmp_path / "annotations.zip"
    annotation_file.write_bytes(b"test")
    captured = {}

    class FakeApiMap:
        def make_endpoint_url(self, path, *, kwsub=None):
            captured["path"] = path
            captured["kwsub"] = kwsub
            return "http://localhost/api/tasks/123/annotations"

    client = SimpleNamespace(
        api_map=FakeApiMap(),
        wait_for_completion=lambda rq_id, *, status_check_period=None: captured.update(
            rq_id=rq_id, status_check_period=status_check_period
        ),
    )

    def upload_file(self, url, filename, *, meta, query_params, fields=None, pbar=None):
        captured["url"] = url
        captured["filename"] = filename
        captured["meta"] = meta
        captured["query_params"] = query_params.copy()
        captured["pbar"] = pbar
        return SimpleNamespace(data=json.dumps({"rq_id": "rq-id"}).encode())

    monkeypatch.setattr(AnnotationUploader, "upload_file", upload_file)

    AnnotationUploader(client).upload_file_and_wait(
        SimpleNamespace(path="/api/tasks/{id}/annotations/"),
        annotation_file,
        "CVAT 1.1",
        import_mode="append",
        url_params={"id": 123},
        pbar=NullProgressReporter(),
        status_check_period=5,
    )

    assert captured["path"] == "/api/tasks/{id}/annotations/"
    assert captured["kwsub"] == {"id": 123}
    assert captured["url"] == "http://localhost/api/tasks/123/annotations"
    assert captured["filename"] == annotation_file
    assert captured["meta"] == {"filename": annotation_file.name}
    assert captured["query_params"] == {
        "format": "CVAT 1.1",
        "filename": annotation_file.name,
        "import_mode": "append",
    }
    assert isinstance(captured["pbar"], NullProgressReporter)
    assert captured["rq_id"] == "rq-id"
    assert captured["status_check_period"] == 5
