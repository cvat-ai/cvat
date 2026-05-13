# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from cvat_sdk.core.proxies.jobs import Job
from cvat_sdk.core.proxies.tasks import Task


@pytest.mark.parametrize("proxy_cls", [Task, Job], ids=["task", "job"])
def test_import_annotations_sends_import_mode_as_query_param(tmp_path: Path, proxy_cls):
    annotation_file = tmp_path / "annotations.zip"
    annotation_file.write_bytes(b"test")
    resource = f"{proxy_cls.__name__.lower()}s"
    endpoint_path = f"/api/{resource}/{{id}}/annotations/"
    expected_url = f"http://localhost/api/{resource}/123/annotations"
    requests = []
    captured_wait = {}

    class FakeApiMap:
        def make_endpoint_url(self, path, *, kwsub=None):
            assert path == endpoint_path
            assert kwsub == {"id": 123}
            return expected_url

    class FakeApiClient:
        def __init__(self):
            self.rest_client = SimpleNamespace(POST=self.post, PATCH=self.patch)

        def get_common_headers(self):
            return {}

        def update_params_for_auth(self, **kwargs):
            return None

        def post(self, url, **kwargs):
            requests.append({"method": "POST", "url": url, **kwargs})
            headers = kwargs["headers"]

            if "Upload-Start" in headers:
                return SimpleNamespace(status=202, msg="Accepted")

            if "Upload-Length" in headers:
                return SimpleNamespace(
                    headers={
                        "Location": "http://localhost/uploads/1",
                        "Upload-Filename": annotation_file.name,
                    }
                )

            assert "Upload-Finish" in headers
            return SimpleNamespace(
                status=202,
                msg="Accepted",
                data=json.dumps({"rq_id": "rq-id"}).encode(),
            )

        def patch(self, url, **kwargs):
            requests.append({"method": "PATCH", "url": url, **kwargs})
            return SimpleNamespace(headers={"Upload-Offset": str(annotation_file.stat().st_size)})

    client = SimpleNamespace(
        api_map=FakeApiMap(),
        api_client=FakeApiClient(),
        logger=SimpleNamespace(info=lambda *args, **kwargs: None),
        wait_for_completion=lambda rq_id, *, status_check_period=None: captured_wait.update(
            rq_id=rq_id, status_check_period=status_check_period
        ),
    )

    proxy = SimpleNamespace(
        id=123,
        api=SimpleNamespace(create_annotations_endpoint=SimpleNamespace(path=endpoint_path)),
        _client=client,
    )

    proxy_cls.import_annotations(
        proxy, "CVAT 1.1", annotation_file, import_mode="append", status_check_period=5
    )

    expected_query_params = {
        "format": "CVAT 1.1",
        "filename": annotation_file.name,
        "import_mode": "append",
    }

    def assert_upload_request(upload_header: str):
        [request] = [request for request in requests if upload_header in request["headers"]]
        assert request["method"] == "POST"
        assert request["url"] == expected_url
        assert request["query_params"] == expected_query_params

    assert_upload_request("Upload-Start")
    assert_upload_request("Upload-Finish")

    assert captured_wait["rq_id"] == "rq-id"
    assert captured_wait["status_check_period"] == 5
