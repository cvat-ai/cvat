# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Tests for the Fusion Export script (utils/fusion_export.py).

Unit tests run without a server.  Integration tests require a running CVAT
instance at http://localhost:8080 with the default ``admin1`` user.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from http import HTTPStatus
from pathlib import Path
from types import SimpleNamespace

import pytest

# ---------------------------------------------------------------------------
# Make ``utils.fusion_export`` importable
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

from utils.fusion_export import (  # noqa: E402
    _build_images_list,
    _get_link_id,
    _print_summary,
    _shape_attributes,
    _shape_frame,
    _shape_label_id,
    _shape_occluded,
    _shape_points,
    _shape_type,
    main,
    parse_args,
)

from shared.utils.config import (  # noqa: E402
    BASE_URL,
    USER_PASS,
    delete_method,
    get_method,
    post_method,
    put_method,
)


# ═══════════════════════════════════════════════════════════════════════════
# 1.  Pure unit tests — no CVAT server required
# ═══════════════════════════════════════════════════════════════════════════
class TestFusionExportUnit:
    """Tests that exercise individual helpers with mocked / in-memory data."""

    # ── parse_args ────────────────────────────────────────────────────────

    def test_parse_args_valid(self):
        args = parse_args([
            "--host", "http://localhost:7000",
            "--username", "u",
            "--password", "p",
            "--task2d-id", "1",
            "--task3d-id", "2",
            "--output-dir", "/tmp/out",
        ])
        assert args.host == "http://localhost:7000"
        assert args.username == "u"
        assert args.password == "p"
        assert args.task2d_id == 1
        assert args.task3d_id == 2
        assert args.output_dir == "/tmp/out"

    def test_parse_args_missing_host_exits(self):
        with pytest.raises(SystemExit):
            parse_args(["--username", "u", "--password", "p",
                         "--task2d-id", "1", "--task3d-id", "2", "--output-dir", "/tmp"])

    def test_parse_args_missing_task2d_id_exits(self):
        with pytest.raises(SystemExit):
            parse_args(["--host", "http://h", "--username", "u",
                         "--password", "p", "--task3d-id", "2", "--output-dir", "/tmp"])

    def test_parse_args_env_fallback(self, monkeypatch):
        monkeypatch.setenv("CVAT_USERNAME", "env_user")
        monkeypatch.setenv("CVAT_PASSWORD", "env_pass")
        args = parse_args([
            "--host", "http://h",
            "--task2d-id", "1",
            "--task3d-id", "2",
            "--output-dir", "/tmp",
        ])
        assert args.username == "env_user"
        assert args.password == "env_pass"

    def test_parse_args_missing_credentials_exits(self, monkeypatch):
        monkeypatch.delenv("CVAT_USERNAME", raising=False)
        monkeypatch.delenv("CVAT_PASSWORD", raising=False)
        with pytest.raises(SystemExit):
            parse_args(["--host", "http://h", "--task2d-id", "1",
                         "--task3d-id", "2", "--output-dir", "/tmp"])

    # ── _get_link_id ─────────────────────────────────────────────────────

    def test_get_link_id_found_dict(self):
        attrs = [{"spec_id": 10, "value": "abc-123"}]
        assert _get_link_id(attrs, {10: "link_id"}) == "abc-123"

    def test_get_link_id_missing_attr(self):
        attrs = [{"spec_id": 10, "value": "abc"}]
        assert _get_link_id(attrs, {10: "other_attr"}) is None

    def test_get_link_id_empty_value(self):
        attrs = [{"spec_id": 10, "value": ""}]
        assert _get_link_id(attrs, {10: "link_id"}) is None

    def test_get_link_id_no_attrs(self):
        assert _get_link_id([], {10: "link_id"}) is None

    def test_get_link_id_sdk_object(self):
        attr = SimpleNamespace(spec_id=10, value="uuid-1")
        assert _get_link_id([attr], {10: "link_id"}) == "uuid-1"

    def test_get_link_id_multiple_attrs(self):
        attrs = [
            {"spec_id": 5, "value": "ignore"},
            {"spec_id": 10, "value": "link-val"},
        ]
        spec_map = {5: "color", 10: "link_id"}
        assert _get_link_id(attrs, spec_map) == "link-val"

    # ── shape accessors ──────────────────────────────────────────────────

    def test_shape_points_dict(self):
        assert _shape_points({"points": [1, 2, 3]}) == [1.0, 2.0, 3.0]

    def test_shape_points_object(self):
        assert _shape_points(SimpleNamespace(points=[4, 5])) == [4.0, 5.0]

    def test_shape_points_empty(self):
        assert _shape_points({}) == []

    def test_shape_type_dict(self):
        assert _shape_type({"type": "rectangle"}) == "rectangle"

    def test_shape_type_enum_style(self):
        assert _shape_type({"type": "LabeledShapeType.CUBOID"}) == "cuboid"

    def test_shape_type_object(self):
        assert _shape_type(SimpleNamespace(type="rectangle")) == "rectangle"

    def test_shape_frame_dict(self):
        assert _shape_frame({"frame": 7}) == 7

    def test_shape_frame_object(self):
        assert _shape_frame(SimpleNamespace(frame=3)) == 3

    def test_shape_label_id_dict(self):
        assert _shape_label_id({"label_id": 42}) == 42

    def test_shape_label_id_object(self):
        assert _shape_label_id(SimpleNamespace(label_id=99)) == 99

    def test_shape_attributes_dict(self):
        val = [{"spec_id": 1}]
        assert _shape_attributes({"attributes": val}) is val

    def test_shape_attributes_object(self):
        val = [SimpleNamespace(spec_id=1)]
        assert _shape_attributes(SimpleNamespace(attributes=val)) is val

    def test_shape_occluded_true(self):
        assert _shape_occluded({"occluded": True}) is True

    def test_shape_occluded_false(self):
        assert _shape_occluded({"occluded": False}) is False

    def test_shape_occluded_default(self):
        assert _shape_occluded({}) is False

    # ── _build_images_list ───────────────────────────────────────────────

    def test_build_images_list_dicts(self):
        frames = [
            {"name": "img_0.jpg", "width": 640, "height": 480},
            {"name": "img_1.jpg", "width": 1920, "height": 1080},
        ]
        result = _build_images_list(frames)
        assert len(result) == 2
        assert result[0] == {"id": 0, "file_name": "img_0.jpg", "width": 640, "height": 480}
        assert result[1]["id"] == 1
        assert result[1]["file_name"] == "img_1.jpg"

    def test_build_images_list_objects(self):
        frames = [SimpleNamespace(name="f.png", width=100, height=200)]
        result = _build_images_list(frames)
        assert result == [{"id": 0, "file_name": "f.png", "width": 100, "height": 200}]

    def test_build_images_list_empty(self):
        assert _build_images_list([]) == []

    # ── _print_summary ───────────────────────────────────────────────────

    def test_print_summary(self, capsys):
        coco_2d = {
            "annotations": [
                {"attributes": {"link_id": "a"}},
                {"attributes": {"link_id": "b"}},
                {"attributes": {"link_id": None}},
            ]
        }
        coco_3d = {
            "annotations": [
                {"attributes": {"link_id": "a"}},
                {"attributes": {"link_id": None}},
            ]
        }
        _print_summary(coco_2d, coco_3d)
        captured = capsys.readouterr().out
        assert "2D annotations exported : 3" in captured
        assert "3D annotations exported : 2" in captured
        assert "Linked pairs (by link_id): 1" in captured  # only "a" is in both
        assert "Unlinked 2D annotations : 2" in captured   # "b" + None
        assert "Unlinked 3D annotations : 1" in captured   # None

    def test_print_summary_no_links(self, capsys):
        coco_2d = {"annotations": [{"attributes": {"link_id": None}}]}
        coco_3d = {"annotations": [{"attributes": {"link_id": None}}]}
        _print_summary(coco_2d, coco_3d)
        captured = capsys.readouterr().out
        assert "Linked pairs (by link_id): 0" in captured


# ═══════════════════════════════════════════════════════════════════════════
# 2.  Integration tests — require a running CVAT instance
# ═══════════════════════════════════════════════════════════════════════════

def _server_available() -> bool:
    """Return True when the CVAT REST API is reachable."""
    try:
        resp = get_method("admin1", "server/about")
        return resp.status_code == HTTPStatus.OK
    except Exception:
        return False


def _wait_for_task_data(task_id: int, *, timeout: int = 60) -> None:
    """Poll until the task's data upload/processing finishes."""
    for _ in range(timeout):
        resp = get_method("admin1", f"tasks/{task_id}")
        if resp.status_code == HTTPStatus.OK:
            status = resp.json().get("status")
            size = resp.json().get("size", 0)
            if size and size > 0:
                return
        time.sleep(1)
    raise TimeoutError(f"Task {task_id} data not ready after {timeout}s")


def _create_task_with_data(name: str, server_files: list[str],
                           labels: list[dict] | None = None,
                           project_id: int | None = None) -> int:
    """Create a task with *server_files* and return task id."""
    task_spec: dict = {"name": name}
    if project_id is not None:
        task_spec["project_id"] = project_id
    if labels is not None:
        task_spec["labels"] = labels
    resp = post_method("admin1", "tasks", task_spec)
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    task_id = resp.json()["id"]

    data_spec = {
        "server_files": server_files,
        "image_quality": 70,
        "use_cache": True,
    }
    data_resp = post_method("admin1", f"tasks/{task_id}/data", data_spec)
    assert data_resp.status_code == HTTPStatus.ACCEPTED, data_resp.text

    _wait_for_task_data(task_id)
    return task_id


def _get_first_job_id(task_id: int) -> int:
    resp = get_method("admin1", "jobs", task_id=task_id)
    assert resp.status_code == HTTPStatus.OK
    return resp.json()["results"][0]["id"]


def _get_label_info(task_id: int) -> tuple[int, int]:
    """Return (label_id, link_id_attr_spec_id) for the first label of a task."""
    resp = get_method("admin1", "labels", task_id=task_id)
    assert resp.status_code == HTTPStatus.OK
    label = resp.json()["results"][0]
    label_id = label["id"]
    attr_spec_id = None
    for attr in label.get("attributes", []):
        if attr["name"] == "link_id":
            attr_spec_id = attr["id"]
            break
    assert attr_spec_id is not None, "link_id attribute not found on label"
    return label_id, attr_spec_id


@pytest.mark.skipif(not _server_available(), reason="CVAT server not running")
class TestFusionExportIntegration:
    """End-to-end tests that create real tasks via the CVAT API."""

    _LABEL_SPEC = [{
        "name": "car",
        "attributes": [{
            "name": "link_id",
            "input_type": "text",
            "mutable": True,
            "default_value": "",
            "values": [],
        }],
    }]

    # ── helpers ───────────────────────────────────────────────────────────

    @pytest.fixture()
    def fusion_tasks(self):
        """Create a 2D and a 3D task, yield their IDs, then delete them."""
        t2d = _create_task_with_data(
            "fusion_2d", ["images/image_0.jpg"], labels=self._LABEL_SPEC)
        t3d = _create_task_with_data(
            "fusion_3d", ["test_canvas3d.zip"], labels=self._LABEL_SPEC)
        yield t2d, t3d
        delete_method("admin1", f"tasks/{t2d}")
        delete_method("admin1", f"tasks/{t3d}")

    # ── tests ─────────────────────────────────────────────────────────────

    def test_full_export_pipeline(self, fusion_tasks):
        """Create linked annotations and verify the exported COCO files."""
        t2d, t3d = fusion_tasks

        # -- lookup label and attribute ids --
        label_id_2d, attr_id_2d = _get_label_info(t2d)
        label_id_3d, attr_id_3d = _get_label_info(t3d)

        job_2d = _get_first_job_id(t2d)
        job_3d = _get_first_job_id(t3d)

        # -- 2D rectangle annotation --
        ann_2d = {
            "shapes": [{
                "type": "rectangle",
                "frame": 0,
                "label_id": label_id_2d,
                "points": [10.0, 20.0, 100.0, 80.0],
                "occluded": False,
                "z_order": 0,
                "attributes": [{"spec_id": attr_id_2d, "value": "test-link-001"}],
            }],
            "tags": [],
            "tracks": [],
        }
        resp = put_method("admin1", f"jobs/{job_2d}/annotations", ann_2d)
        assert resp.status_code == HTTPStatus.OK, resp.text

        # -- 3D cuboid annotation (16 floats: x,y,z, rx,ry,rz, dx,dy,dz, 0...) --
        ann_3d = {
            "shapes": [{
                "type": "cuboid",
                "frame": 0,
                "label_id": label_id_3d,
                "points": [1.0, 2.0, 3.0, 0.1, 0.2, 0.3, 4.0, 5.0, 6.0, 0, 0, 0, 0, 0, 0, 0],
                "occluded": False,
                "z_order": 0,
                "attributes": [{"spec_id": attr_id_3d, "value": "test-link-001"}],
            }],
            "tags": [],
            "tracks": [],
        }
        resp = put_method("admin1", f"jobs/{job_3d}/annotations", ann_3d)
        assert resp.status_code == HTTPStatus.OK, resp.text

        # -- run the export script --
        with tempfile.TemporaryDirectory() as tmpdir:
            main([
                "--host", BASE_URL,
                "--username", "admin1",
                "--password", USER_PASS,
                "--task2d-id", str(t2d),
                "--task3d-id", str(t3d),
                "--output-dir", tmpdir,
            ])

            path_2d = Path(tmpdir) / "coco_2d.json"
            path_3d = Path(tmpdir) / "coco_3d.json"
            assert path_2d.exists(), "coco_2d.json not written"
            assert path_3d.exists(), "coco_3d.json not written"

            coco_2d = json.loads(path_2d.read_text())
            coco_3d = json.loads(path_3d.read_text())

        # -- verify 2D COCO --
        assert coco_2d["categories"][0]["name"] == "car"
        assert len(coco_2d["annotations"]) == 1
        a2 = coco_2d["annotations"][0]
        assert a2["bbox"] == [10.0, 20.0, 90.0, 60.0]  # x, y, w, h
        assert a2["area"] == 5400.0
        assert a2["attributes"]["link_id"] == "test-link-001"
        assert a2["iscrowd"] == 0
        assert a2["image_id"] == 0

        # -- verify 3D COCO --
        assert coco_3d["categories"][0]["name"] == "car"
        assert len(coco_3d["annotations"]) == 1
        a3 = coco_3d["annotations"][0]
        assert a3["bbox_3d"]["center"] == [1.0, 2.0, 3.0]
        assert a3["bbox_3d"]["dimensions"] == [4.0, 5.0, 6.0]
        assert a3["bbox_3d"]["rotation"] == [0.1, 0.2, 0.3]
        assert a3["attributes"]["link_id"] == "test-link-001"

        # -- cross-reference --
        assert a2["attributes"]["link_id"] == a3["attributes"]["link_id"]

    def test_export_unlinked_annotations(self, fusion_tasks):
        """Annotations without link_id should export with link_id=null."""
        t2d, t3d = fusion_tasks

        label_id_2d, attr_id_2d = _get_label_info(t2d)
        job_2d = _get_first_job_id(t2d)

        ann = {
            "shapes": [{
                "type": "rectangle",
                "frame": 0,
                "label_id": label_id_2d,
                "points": [5.0, 5.0, 50.0, 50.0],
                "occluded": False,
                "z_order": 0,
                "attributes": [{"spec_id": attr_id_2d, "value": ""}],
            }],
            "tags": [],
            "tracks": [],
        }
        resp = put_method("admin1", f"jobs/{job_2d}/annotations", ann)
        assert resp.status_code == HTTPStatus.OK

        with tempfile.TemporaryDirectory() as tmpdir:
            main([
                "--host", BASE_URL,
                "--username", "admin1",
                "--password", USER_PASS,
                "--task2d-id", str(t2d),
                "--task3d-id", str(t3d),
                "--output-dir", tmpdir,
            ])
            coco_2d = json.loads((Path(tmpdir) / "coco_2d.json").read_text())

        assert len(coco_2d["annotations"]) == 1
        assert coco_2d["annotations"][0]["attributes"]["link_id"] is None

    def test_export_multiple_annotations(self, fusion_tasks):
        """Multiple annotations, some linked and some not."""
        t2d, t3d = fusion_tasks

        label_id_2d, attr_id_2d = _get_label_info(t2d)
        label_id_3d, attr_id_3d = _get_label_info(t3d)
        job_2d = _get_first_job_id(t2d)
        job_3d = _get_first_job_id(t3d)

        ann_2d = {
            "shapes": [
                {
                    "type": "rectangle", "frame": 0, "label_id": label_id_2d,
                    "points": [0, 0, 10, 10], "occluded": False, "z_order": 0,
                    "attributes": [{"spec_id": attr_id_2d, "value": "link-A"}],
                },
                {
                    "type": "rectangle", "frame": 0, "label_id": label_id_2d,
                    "points": [20, 20, 40, 40], "occluded": False, "z_order": 0,
                    "attributes": [{"spec_id": attr_id_2d, "value": ""}],
                },
            ],
            "tags": [], "tracks": [],
        }
        resp = put_method("admin1", f"jobs/{job_2d}/annotations", ann_2d)
        assert resp.status_code == HTTPStatus.OK

        ann_3d = {
            "shapes": [{
                "type": "cuboid", "frame": 0, "label_id": label_id_3d,
                "points": [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                "occluded": False, "z_order": 0,
                "attributes": [{"spec_id": attr_id_3d, "value": "link-A"}],
            }],
            "tags": [], "tracks": [],
        }
        resp = put_method("admin1", f"jobs/{job_3d}/annotations", ann_3d)
        assert resp.status_code == HTTPStatus.OK

        with tempfile.TemporaryDirectory() as tmpdir:
            main([
                "--host", BASE_URL,
                "--username", "admin1",
                "--password", USER_PASS,
                "--task2d-id", str(t2d),
                "--task3d-id", str(t3d),
                "--output-dir", tmpdir,
            ])
            coco_2d = json.loads((Path(tmpdir) / "coco_2d.json").read_text())
            coco_3d = json.loads((Path(tmpdir) / "coco_3d.json").read_text())

        assert len(coco_2d["annotations"]) == 2
        assert len(coco_3d["annotations"]) == 1

        linked_2d = [a for a in coco_2d["annotations"]
                     if a["attributes"]["link_id"] == "link-A"]
        unlinked_2d = [a for a in coco_2d["annotations"]
                       if a["attributes"]["link_id"] is None]
        assert len(linked_2d) == 1
        assert len(unlinked_2d) == 1
        assert coco_3d["annotations"][0]["attributes"]["link_id"] == "link-A"

    def test_export_skips_non_rectangle_2d(self, fusion_tasks):
        """Non-rectangle shapes in the 2D task should be skipped."""
        t2d, t3d = fusion_tasks

        label_id_2d, attr_id_2d = _get_label_info(t2d)
        job_2d = _get_first_job_id(t2d)

        ann = {
            "shapes": [
                {
                    "type": "rectangle", "frame": 0, "label_id": label_id_2d,
                    "points": [0, 0, 50, 50], "occluded": False, "z_order": 0,
                    "attributes": [{"spec_id": attr_id_2d, "value": ""}],
                },
                {
                    "type": "polygon", "frame": 0, "label_id": label_id_2d,
                    "points": [0, 0, 50, 0, 50, 50], "occluded": False, "z_order": 0,
                    "attributes": [{"spec_id": attr_id_2d, "value": ""}],
                },
            ],
            "tags": [], "tracks": [],
        }
        resp = put_method("admin1", f"jobs/{job_2d}/annotations", ann)
        assert resp.status_code == HTTPStatus.OK

        with tempfile.TemporaryDirectory() as tmpdir:
            main([
                "--host", BASE_URL,
                "--username", "admin1",
                "--password", USER_PASS,
                "--task2d-id", str(t2d),
                "--task3d-id", str(t3d),
                "--output-dir", tmpdir,
            ])
            coco_2d = json.loads((Path(tmpdir) / "coco_2d.json").read_text())

        # Only the rectangle should appear
        assert len(coco_2d["annotations"]) == 1
        assert coco_2d["annotations"][0]["bbox"] == [0.0, 0.0, 50.0, 50.0]
