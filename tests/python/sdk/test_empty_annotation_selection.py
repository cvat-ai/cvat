# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import copy
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

import pytest

from cvat_sdk.core.client import Client


def _annotations():
    return {
        "version": 0,
        "tags": [
            {"id": 11, "frame": 0, "label_id": 1, "group": 0, "source": "manual", "attributes": []}
        ],
        "shapes": [
            {
                "id": 22,
                "frame": 0,
                "label_id": 1,
                "type": "rectangle",
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "occluded": False,
                "outside": False,
                "z_order": 0,
                "group": 0,
                "source": "manual",
                "attributes": [],
                "elements": [],
            }
        ],
        "tracks": [
            {
                "id": 33,
                "frame": 0,
                "label_id": 2,
                "group": 0,
                "source": "manual",
                "attributes": [],
                "elements": [],
                "shapes": [
                    {
                        "frame": 0,
                        "type": "rectangle",
                        "points": [4.0, 5.0, 6.0, 7.0],
                        "rotation": 0,
                        "occluded": False,
                        "outside": False,
                        "z_order": 0,
                        "attributes": [],
                    }
                ],
            }
        ],
    }


@pytest.fixture(params=["tasks", "jobs"])
def annotation_endpoint(request):
    state = _annotations()
    calls = []
    resource = request.param
    object_path = f"/api/{resource}/7"
    path = object_path + "/annotations"

    class Handler(BaseHTTPRequestHandler):
        def _respond(self, status, data=None):
            body = json.dumps(data).encode() if data is not None else b""
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            requested_path = urlsplit(self.path).path.rstrip("/")
            calls.append(("GET", None))
            if requested_path == object_path:
                metadata = {"id": 7, "labels": {}}
                if resource == "tasks":
                    metadata.update(
                        name="annotation selection",
                        jobs={"completed": 0, "validation": 0},
                    )
                else:
                    metadata.update(start_frame=0, stop_frame=1, frame_count=2, issues={})
                self._respond(200, metadata)
                return
            assert requested_path == path
            self._respond(200, state)

        def do_PATCH(self):
            parsed = urlsplit(self.path)
            assert parsed.path.rstrip("/") == path
            assert parse_qs(parsed.query)["action"] == ["delete"]
            data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            calls.append(("PATCH", data))
            for key in ("tags", "shapes", "tracks"):
                ids = {item["id"] for item in data[key]}
                state[key] = [item for item in state[key] if item["id"] not in ids]
            self._respond(200, data)

        def do_DELETE(self):
            assert urlsplit(self.path).path.rstrip("/") == path
            calls.append(("DELETE", None))
            for key in ("tags", "shapes", "tracks"):
                state[key].clear()
            self._respond(204)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=lambda: server.serve_forever(poll_interval=0.01), daemon=True)
    thread.start()
    try:
        with Client(f"http://127.0.0.1:{server.server_port}", check_server_version=False) as client:
            entity = getattr(client, resource).retrieve(7)
            calls.clear()
            yield entity, calls, state
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


@pytest.mark.parametrize("ids", [[], (), set(), frozenset(), range(0)])
def test_empty_annotation_selection_sends_no_request(annotation_endpoint, ids):
    entity, calls, state = annotation_endpoint
    before = copy.deepcopy(state)

    assert entity.remove_annotations(ids=ids) is None

    assert state == before
    assert calls == []
    assert len(ids) == 0


@pytest.mark.parametrize("ids", [[11], [22], [33], [11, 22, 33], [11, 11, 33], [999]])
def test_nonempty_selection_keeps_partial_delete_contract(annotation_endpoint, ids):
    entity, calls, state = annotation_endpoint
    before = copy.deepcopy(state)
    original_ids = ids.copy()

    entity.remove_annotations(ids=ids)

    assert ids == original_ids
    assert [method for method, _ in calls] == ["GET", "PATCH"]
    sent = calls[1][1]
    for key in ("tags", "shapes", "tracks"):
        expected_ids = [item["id"] for item in before[key] if item["id"] in ids]
        assert [item["id"] for item in sent[key]] == expected_ids
        assert state[key] == [item for item in before[key] if item["id"] not in ids]


@pytest.mark.parametrize("explicit_none", [False, True])
def test_omitted_or_none_selection_still_deletes_all(annotation_endpoint, explicit_none):
    entity, calls, state = annotation_endpoint

    if explicit_none:
        entity.remove_annotations(ids=None)
    else:
        entity.remove_annotations()

    assert calls == [("DELETE", None)]
    assert all(state[key] == [] for key in ("tags", "shapes", "tracks"))


def test_empty_label_filter_cannot_erase_other_annotations(annotation_endpoint):
    entity, calls, state = annotation_endpoint
    before = copy.deepcopy(state)
    selected = [shape.id for shape in entity.get_annotations().shapes if shape.label_id == 999]

    entity.remove_annotations(ids=selected)

    assert selected == []
    assert calls == [("GET", None)]
    assert state == before
