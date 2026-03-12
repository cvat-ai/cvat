#!/usr/bin/env python3
"""CVAT Fusion Export — export linked 2D/3D annotations to cross-referenced COCO JSON.

This script connects to a CVAT instance, retrieves a 2D (camera) task and a 3D
(point-cloud) task, and exports their annotations into two COCO-format JSON
files (``coco_2d.json`` and ``coco_3d.json``).

Annotations are cross-referenced via a shared ``link_id`` text attribute on each
label.  The ``link_id`` value (typically a UUID) appears in both output files so
that downstream consumers can join 2D bounding boxes with their corresponding 3D
cuboids.

Usage
-----
::

    python utils/fusion_export.py \\
        --host http://localhost:7000 \\
        --username admin \\
        --password admin123 \\
        --task2d-id 1 \\
        --task3d-id 2 \\
        --output-dir ./export

``--username`` / ``--password`` fall back to the environment variables
``CVAT_USERNAME`` and ``CVAT_PASSWORD`` when not supplied on the command line.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# CVAT SDK client helpers
# ---------------------------------------------------------------------------

def _make_client(host: str, username: str, password: str) -> Any:
    """Create and authenticate a CVAT SDK client.

    Tries ``make_client`` first; falls back to the lower-level
    ``Client`` / ``Config`` constructor when ``make_client`` is not available.
    """
    try:
        from cvat_sdk import make_client  # noqa: WPS433
        client = make_client(host, credentials=(username, password))
    except ImportError:
        from cvat_sdk.core.client import Client, Config  # noqa: WPS433
        client = Client(url=host, config=Config())
        client.login(credentials=(username, password))
    return client


# ---------------------------------------------------------------------------
# Data-fetching helpers
# ---------------------------------------------------------------------------

def _build_label_map(
    client: Any,
    task_id: int,
) -> Tuple[Dict[int, int], Dict[int, str], List[Dict[str, Any]]]:
    """Return mappings built from the task's labels.

    Returns
    -------
    label_to_category : dict[int, int]
        CVAT label_id  →  1-based COCO category_id.
    label_to_name : dict[int, str]
        CVAT label_id  →  human-readable label name.
    categories : list[dict]
        Ready-to-serialise COCO ``categories`` list.
    """
    labels_page = client.labels.list(task_id=task_id)
    labels = labels_page.results if hasattr(labels_page, "results") else list(labels_page)

    label_to_category: Dict[int, int] = {}
    label_to_name: Dict[int, str] = {}
    categories: List[Dict[str, Any]] = []

    for idx, label in enumerate(sorted(labels, key=lambda l: l.id), start=1):
        label_to_category[label.id] = idx
        label_to_name[label.id] = label.name
        categories.append(
            {"id": idx, "name": label.name, "supercategory": "object"},
        )

    return label_to_category, label_to_name, categories


def _build_attr_spec_map(client: Any, task_id: int) -> Dict[int, str]:
    """Map every attribute spec_id to its name across all task labels."""
    labels_page = client.labels.list(task_id=task_id)
    labels = labels_page.results if hasattr(labels_page, "results") else list(labels_page)

    spec_map: Dict[int, str] = {}
    for label in labels:
        for attr in label.attributes:
            spec_map[attr.id] = attr.name
    return spec_map


def _get_link_id(
    shape_attributes: List[Any],
    attr_spec_map: Dict[int, str],
) -> Optional[str]:
    """Extract the ``link_id`` value from an annotation's attribute list.

    Parameters
    ----------
    shape_attributes
        List of attribute dicts / objects with ``spec_id`` and ``value``.
    attr_spec_map
        Global spec_id → attribute name mapping.

    Returns
    -------
    str or None
        The link_id string, or ``None`` when the attribute is missing or empty.
    """
    for attr in shape_attributes:
        spec_id = attr.spec_id if hasattr(attr, "spec_id") else attr.get("spec_id")
        value = attr.value if hasattr(attr, "value") else attr.get("value")
        name = attr_spec_map.get(spec_id, "")
        if name == "link_id" and value:
            return str(value)
    return None


def _get_task_by_id(client: Any, task_id: int) -> Any:
    """Retrieve a task by ID. Raises ``SystemExit`` if not found."""
    try:
        return client.tasks.retrieve(id=task_id)
    except Exception as exc:
        print(f"ERROR: Could not retrieve task {task_id} — {exc}", file=sys.stderr)
        sys.exit(1)


def _collect_annotations(client: Any, task: Any) -> List[Any]:
    """Collect all shape annotations across every job that belongs to *task*."""
    jobs_page = client.jobs.list(task_id=task.id)
    jobs = jobs_page.results if hasattr(jobs_page, "results") else list(jobs_page)

    shapes: List[Any] = []
    for job in jobs:
        ann = client.jobs.api.retrieve_annotations(job.id)
        job_shapes = ann.shapes if hasattr(ann, "shapes") else ann.get("shapes", [])
        shapes.extend(job_shapes)
    return shapes


def _get_frame_meta(client: Any, task: Any) -> List[Any]:
    """Return per-frame metadata (name, width, height) for *task*."""
    meta = client.tasks.api.retrieve_data_meta(task.id)
    return meta.frames if hasattr(meta, "frames") else meta.get("frames", [])


# ---------------------------------------------------------------------------
# COCO-building helpers
# ---------------------------------------------------------------------------

def _build_images_list(frames: List[Any]) -> List[Dict[str, Any]]:
    """Build the ``images`` section of a COCO file from frame metadata."""
    images: List[Dict[str, Any]] = []
    for idx, frame in enumerate(frames):
        name = frame.name if hasattr(frame, "name") else frame.get("name", f"frame_{idx:06d}")
        width = frame.width if hasattr(frame, "width") else frame.get("width", 0)
        height = frame.height if hasattr(frame, "height") else frame.get("height", 0)
        images.append(
            {"id": idx, "file_name": name, "width": int(width), "height": int(height)},
        )
    return images


def _shape_points(shape: Any) -> List[float]:
    """Return the points list regardless of SDK object type."""
    pts = shape.points if hasattr(shape, "points") else shape.get("points", [])
    return [float(p) for p in pts]


def _shape_label_id(shape: Any) -> int:
    return int(shape.label_id if hasattr(shape, "label_id") else shape.get("label_id"))


def _shape_type(shape: Any) -> str:
    val = shape.type if hasattr(shape, "type") else shape.get("type", "")
    return str(val).lower().replace("labeledshapetype.", "")


def _shape_frame(shape: Any) -> int:
    return int(shape.frame if hasattr(shape, "frame") else shape.get("frame", 0))


def _shape_attributes(shape: Any) -> List[Any]:
    return shape.attributes if hasattr(shape, "attributes") else shape.get("attributes", [])


def _shape_occluded(shape: Any) -> bool:
    return bool(shape.occluded if hasattr(shape, "occluded") else shape.get("occluded", False))


# ---------------------------------------------------------------------------
# Summary / linkage analysis
# ---------------------------------------------------------------------------

def _print_summary(
    coco_2d: Dict[str, Any],
    coco_3d: Dict[str, Any],
) -> None:
    """Print a human-readable summary of the export to stdout."""
    ann_2d = coco_2d["annotations"]
    ann_3d = coco_3d["annotations"]

    link_ids_2d = {
        a["attributes"]["link_id"] for a in ann_2d if a["attributes"].get("link_id")
    }
    link_ids_3d = {
        a["attributes"]["link_id"] for a in ann_3d if a["attributes"].get("link_id")
    }

    linked = link_ids_2d & link_ids_3d
    unlinked_2d = len(ann_2d) - sum(
        1 for a in ann_2d if a["attributes"].get("link_id") in linked
    )
    unlinked_3d = len(ann_3d) - sum(
        1 for a in ann_3d if a["attributes"].get("link_id") in linked
    )

    print("=" * 60)
    print("CVAT Fusion Export Summary")
    print("=" * 60)
    print(f"  2D annotations exported : {len(ann_2d)}")
    print(f"  3D annotations exported : {len(ann_3d)}")
    print(f"  Linked pairs (by link_id): {len(linked)}")
    print(f"  Unlinked 2D annotations : {unlinked_2d}")
    print(f"  Unlinked 3D annotations : {unlinked_3d}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# CLI & main
# ---------------------------------------------------------------------------

def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Export linked 2D/3D annotations from a CVAT project to COCO JSON.",
    )
    parser.add_argument(
        "--host",
        required=True,
        help="CVAT server URL, e.g. http://localhost:7000",
    )
    parser.add_argument(
        "--username",
        default=os.environ.get("CVAT_USERNAME"),
        help="CVAT username (env: CVAT_USERNAME)",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("CVAT_PASSWORD"),
        help="CVAT password (env: CVAT_PASSWORD)",
    )
    parser.add_argument(
        "--task2d-id",
        type=int,
        required=True,
        help="Numeric CVAT task ID for the 2D (camera) task",
    )
    parser.add_argument(
        "--task3d-id",
        type=int,
        required=True,
        help="Numeric CVAT task ID for the 3D (point-cloud) task",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory where coco_2d.json and coco_3d.json will be written",
    )
    args = parser.parse_args(argv)

    if not args.username:
        parser.error("--username is required (or set CVAT_USERNAME)")
    if not args.password:
        parser.error("--password is required (or set CVAT_PASSWORD)")

    return args


def main(argv: Optional[List[str]] = None) -> None:  # noqa: C901
    """Entry point for the fusion export script."""
    args = parse_args(argv)

    # ── Connect ───────────────────────────────────────────────────────────
    print(f"Connecting to {args.host} …")
    try:
        client = _make_client(args.host, args.username, args.password)
    except Exception as exc:
        print(f"ERROR: Authentication failed — {exc}", file=sys.stderr)
        sys.exit(1)

    task2d_id: int = args.task2d_id
    task3d_id: int = args.task3d_id

    # ── Retrieve tasks ────────────────────────────────────────────────────
    print(f"Fetching tasks {task2d_id} (2D) and {task3d_id} (3D) …")
    task_2d = _get_task_by_id(client, task2d_id)
    task_3d = _get_task_by_id(client, task3d_id)

    # ── Labels / categories (use 2D task labels; assumed matching) ────────
    label_to_category, _label_names, categories = _build_label_map(client, task2d_id)
    attr_spec_map = _build_attr_spec_map(client, task2d_id)

    # ── Tasks ─────────────────────────────────────────────────────────────
    print(f"  2D task: id={task_2d.id}  name={task_2d.name}")
    print(f"  3D task: id={task_3d.id}  name={task_3d.name}")

    # ── Frame metadata ────────────────────────────────────────────────────
    print("Fetching frame metadata …")
    frames_2d = _get_frame_meta(client, task_2d)
    frames_3d = _get_frame_meta(client, task_3d)

    # ── Annotations ───────────────────────────────────────────────────────
    print("Fetching annotations …")
    shapes_2d = _collect_annotations(client, task_2d)
    shapes_3d = _collect_annotations(client, task_3d)

    # ── Build COCO dicts ──────────────────────────────────────────────────
    print("Building COCO structures …")

    coco_2d: Dict[str, Any] = {
        "info": {"description": "CVAT Fusion Export - 2D", "version": "1.0", "year": 2026},
        "images": _build_images_list(frames_2d),
        "categories": categories,
        "annotations": [],
    }

    ann_id = 1
    for shape in shapes_2d:
        if _shape_type(shape) != "rectangle":
            continue
        pts = _shape_points(shape)
        if len(pts) < 4:
            continue
        x1, y1, x2, y2 = pts[0], pts[1], pts[2], pts[3]
        w, h = x2 - x1, y2 - y1
        cat_id = label_to_category.get(_shape_label_id(shape))
        if cat_id is None:
            continue
        link_id = _get_link_id(_shape_attributes(shape), attr_spec_map)
        coco_2d["annotations"].append({
            "id": ann_id,
            "image_id": _shape_frame(shape),
            "category_id": cat_id,
            "bbox": [round(x1, 2), round(y1, 2), round(w, 2), round(h, 2)],
            "area": round(w * h, 2),
            "iscrowd": 0,
            "occluded": _shape_occluded(shape),
            "attributes": {"link_id": link_id},
        })
        ann_id += 1

    coco_3d: Dict[str, Any] = {
        "info": {"description": "CVAT Fusion Export - 3D", "version": "1.0", "year": 2026},
        "images": _build_images_list(frames_3d),
        "categories": categories,
        "annotations": [],
    }

    ann_id = 1
    for shape in shapes_3d:
        if _shape_type(shape) != "cuboid":
            continue
        pts = _shape_points(shape)
        if len(pts) < 9:
            continue
        # CVAT 3D format: [x, y, z, rx, ry, rz, dx, dy, dz]
        cx, cy, cz = pts[0], pts[1], pts[2]
        rx, ry, rz = pts[3], pts[4], pts[5]
        dx, dy, dz = pts[6], pts[7], pts[8]
        cat_id = label_to_category.get(_shape_label_id(shape))
        if cat_id is None:
            continue
        link_id = _get_link_id(_shape_attributes(shape), attr_spec_map)
        coco_3d["annotations"].append({
            "id": ann_id,
            "image_id": _shape_frame(shape),
            "category_id": cat_id,
            "bbox_3d": {
                "center": [round(cx, 4), round(cy, 4), round(cz, 4)],
                "dimensions": [round(dx, 4), round(dy, 4), round(dz, 4)],
                "rotation": [round(rx, 4), round(ry, 4), round(rz, 4)],
            },
            "occluded": _shape_occluded(shape),
            "attributes": {"link_id": link_id},
        })
        ann_id += 1

    # ── Write output ──────────────────────────────────────────────────────
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    path_2d = out_dir / "coco_2d.json"
    path_3d = out_dir / "coco_3d.json"

    with open(path_2d, "w", encoding="utf-8") as fh:
        json.dump(coco_2d, fh, indent=2, ensure_ascii=False)
    print(f"Wrote {path_2d}")

    with open(path_3d, "w", encoding="utf-8") as fh:
        json.dump(coco_3d, fh, indent=2, ensure_ascii=False)
    print(f"Wrote {path_3d}")

    # ── Summary ───────────────────────────────────────────────────────────
    _print_summary(coco_2d, coco_3d)


if __name__ == "__main__":
    main()
