#!/usr/bin/env python3
"""One-command demo: spin up a fusion-ready project and print the editor URL.

Usage:
    python utils/setup_fusion_demo.py

Assumes CVAT is running at localhost:8080 (docker compose up -d).
Creates a project with a 2D task + 3D task + sample linked annotations.
"""

import json
import sys
import time

import requests

BASE = "http://localhost:8080"
API = f"{BASE}/api"
USER = "admin"
EMAIL = "admin@localhost.company"
PASS = "12qwaszx"

s = requests.Session()
s.auth = (USER, PASS)


def wait_for_server(timeout=120):
    print("Waiting for CVAT server …", end="", flush=True)
    for _ in range(timeout):
        try:
            r = s.get(f"{API}/server/about", timeout=3)
            if r.status_code == 200:
                print(" ready.")
                return
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(1)
    print("\nERROR: CVAT server not reachable at", BASE)
    sys.exit(1)


def ensure_superuser():
    """Create superuser if it doesn't already exist."""
    r = s.get(f"{API}/users/self")
    if r.status_code == 200:
        return  # already reachable
    # Try registering — on fresh instance this may be needed
    r = requests.post(f"{API}/auth/register", json={
        "username": USER,
        "email": EMAIL,
        "password1": PASS,
        "password2": PASS,
    })
    if r.status_code not in (200, 201, 400):  # 400 = already exists
        print(f"Warning: could not ensure superuser (status {r.status_code})")


def create_project():
    print("Creating project …")
    r = s.post(f"{API}/projects", json={
        "name": "Fusion Demo",
        "labels": [{
            "name": "car",
            "attributes": [{
                "name": "link_id",
                "input_type": "text",
                "mutable": True,
                "default_value": "",
                "values": [],
            }],
        }],
    })
    assert r.status_code == 201, f"Project creation failed: {r.text}"
    pid = r.json()["id"]
    print(f"  Project ID: {pid}")
    return pid


def create_task(name, project_id, server_files):
    print(f"Creating task '{name}' …")
    r = s.post(f"{API}/tasks", json={"name": name, "project_id": project_id})
    assert r.status_code == 201, f"Task creation failed: {r.text}"
    tid = r.json()["id"]

    r = s.post(f"{API}/tasks/{tid}/data", json={
        "server_files": server_files,
        "image_quality": 70,
        "use_cache": True,
    })
    assert r.status_code == 202, f"Data upload failed: {r.text}"

    # Wait for processing
    print(f"  Processing …", end="", flush=True)
    for _ in range(60):
        r = s.get(f"{API}/tasks/{tid}")
        if r.ok and r.json().get("size", 0) > 0:
            break
        print(".", end="", flush=True)
        time.sleep(1)
    print(f" done (task {tid})")
    return tid


def get_job_id(task_id):
    r = s.get(f"{API}/jobs", params={"task_id": task_id})
    assert r.ok
    return r.json()["results"][0]["id"]


def get_label_and_attr(task_id):
    r = s.get(f"{API}/labels", params={"task_id": task_id})
    assert r.ok
    label = r.json()["results"][0]
    attr_id = next(a["id"] for a in label["attributes"] if a["name"] == "link_id")
    return label["id"], attr_id


def add_annotations(job_id, label_id, attr_id, shapes):
    r = s.put(f"{API}/jobs/{job_id}/annotations", json={
        "shapes": shapes,
        "tags": [],
        "tracks": [],
    })
    assert r.ok, f"Annotation failed: {r.text}"


def main():
    wait_for_server()
    ensure_superuser()

    pid = create_project()
    t2d = create_task("Demo 2D (images)", pid, ["images/image_0.jpg"])
    t3d = create_task("Demo 3D (point cloud)", pid, ["test_canvas3d.zip"])

    # Get job/label info
    job_2d = get_job_id(t2d)
    job_3d = get_job_id(t3d)
    lid_2d, aid_2d = get_label_and_attr(t2d)
    lid_3d, aid_3d = get_label_and_attr(t3d)

    print("Adding sample annotations …")

    # 2D: two rectangles, one linked
    add_annotations(job_2d, lid_2d, aid_2d, [
        {
            "type": "rectangle", "frame": 0, "label_id": lid_2d,
            "points": [50, 30, 280, 220], "occluded": False, "z_order": 0,
            "attributes": [{"spec_id": aid_2d, "value": "link-001"}],
        },
        {
            "type": "rectangle", "frame": 0, "label_id": lid_2d,
            "points": [300, 100, 500, 350], "occluded": False, "z_order": 0,
            "attributes": [{"spec_id": aid_2d, "value": ""}],
        },
    ])

    # 3D: one cuboid, linked
    add_annotations(job_3d, lid_3d, aid_3d, [
        {
            "type": "cuboid", "frame": 0, "label_id": lid_3d,
            "points": [0.5, 1.0, 0.3, 0.0, 0.0, 0.1, 2.0, 1.5, 1.8],
            "occluded": False, "z_order": 0,
            "attributes": [{"spec_id": aid_3d, "value": "link-001"}],
        },
    ])

    print()
    print("=" * 60)
    print("  FUSION DEMO READY")
    print("=" * 60)
    print(f"  Project:  {BASE}/projects/{pid}")
    print(f"  Fusion:   {BASE}/fusion/{pid}")
    print(f"  2D task:  {BASE}/tasks/{t2d}")
    print(f"  3D task:  {BASE}/tasks/{t3d}")
    print()
    print(f"  Open the editor:  {BASE}/fusion/{pid}")
    print("=" * 60)


if __name__ == "__main__":
    main()
