"""
Checks the two exclusions in stats.py on a running CVAT, which the COCO task cannot exercise.

1. A box in a ground-truth job must not change the task's count.
2. A skeleton with two points counts as one annotation, not three.

Usage: python docs/bench/exclusion_check.py <username> <password> <image> [base_url]
Creates a throwaway task from <image>, prints counts before/after each step, and deletes the task.
"""

import json
import sys
import time
import urllib.request
import uuid

username, password, image = sys.argv[1], sys.argv[2], sys.argv[3]
base = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:8080"


def call(method, path, token, body=None, raw=None, content_type="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    request = urllib.request.Request(
        base + path,
        method=method,
        data=data,
        headers={"Content-Type": content_type}
        | ({"Authorization": f"Token {token}"} if token else {}),
    )
    with urllib.request.urlopen(request) as response:
        text = response.read()
        return json.loads(text) if text else None


def counts(token, task_id):
    stats = call("GET", f"/api/annotation-stats/{task_id}", token)
    return stats["total"], {label["name"]: label["by_type"] for label in stats["labels"]}


token = call("POST", "/api/auth/login", None, {"username": username, "password": password})["key"]
skeleton_svg = (
    '<circle r="1" cx="30" cy="30" data-type="element node" data-element-id="1" data-node-id="1" '
    'data-label-name="head"></circle>'
    '<circle r="1" cx="60" cy="60" data-type="element node" data-element-id="2" data-node-id="2" '
    'data-label-name="tail"></circle>'
)
task = call(
    "POST",
    "/api/tasks",
    token,
    {
        "name": "exclusion check",
        "labels": [
            {"name": "box", "type": "rectangle"},
            {
                "name": "pose",
                "type": "skeleton",
                "svg": skeleton_svg,
                "sublabels": [
                    {"name": "head", "type": "points"},
                    {"name": "tail", "type": "points"},
                ],
            },
        ],
    },
)
boundary = uuid.uuid4().hex
with open(image, "rb") as f:
    body = (
        (
            f'--{boundary}\r\nContent-Disposition: form-data; name="image_quality"\r\n\r\n70\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="client_files[0]"; filename="a.jpg"\r\n'
            "Content-Type: image/jpeg\r\n\r\n"
        ).encode()
        + f.read()
        + f"\r\n--{boundary}--\r\n".encode()
    )
call(
    "POST",
    f"/api/tasks/{task['id']}/data",
    token,
    raw=body,
    content_type=f"multipart/form-data; boundary={boundary}",
)
while call("GET", f"/api/tasks/{task['id']}", token)["size"] == 0:
    time.sleep(1)

try:
    labels = {
        label["name"]: label
        for label in call("GET", f"/api/labels?task_id={task['id']}", token)["results"]
    }
    sublabels = {s["name"]: s["id"] for s in labels["pose"]["sublabels"]}
    annotation_job = call("GET", f"/api/jobs?task_id={task['id']}", token)["results"][0]
    print("start:", counts(token, task["id"]))

    def add(job_id, shape):
        call(
            "PATCH",
            f"/api/jobs/{job_id}/annotations?action=create",
            token,
            {"shapes": [shape], "tracks": [], "tags": []},
        )

    box = {
        "type": "rectangle",
        "frame": 0,
        "label_id": labels["box"]["id"],
        "points": [1, 1, 20, 20],
        "attributes": [],
        "group": 0,
        "source": "manual",
    }
    add(annotation_job["id"], box)
    print("1 box in the annotation job:", counts(token, task["id"]))

    gt_job = call(
        "POST",
        "/api/jobs",
        token,
        {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "manual",
            "frames": [0],
        },
    )
    add(gt_job["id"], box)
    print("+1 box in a ground truth job:", counts(token, task["id"]))
    gt_shapes = call("GET", f"/api/jobs/{gt_job['id']}/annotations", token)["shapes"]
    print("  (the ground truth job does hold it:", len(gt_shapes), "shape)")

    points = lambda name, xy: {
        "type": "points",
        "frame": 0,
        "label_id": sublabels[name],
        "points": xy,
        "attributes": [],
        "group": 0,
        "source": "manual",
        "outside": False,
    }
    add(
        annotation_job["id"],
        {
            "type": "skeleton",
            "frame": 0,
            "label_id": labels["pose"]["id"],
            "points": [],
            "attributes": [],
            "group": 0,
            "source": "manual",
            "elements": [points("head", [30, 30]), points("tail", [60, 60])],
        },
    )
    print("+1 skeleton with 2 points:", counts(token, task["id"]))
    skeleton = next(
        shape
        for shape in call("GET", f"/api/jobs/{annotation_job['id']}/annotations", token)["shapes"]
        if shape["type"] == "skeleton"
    )
    print("  (the skeleton is stored with", len(skeleton["elements"]), "child point shapes)")
finally:
    call("DELETE", f"/api/tasks/{task['id']}", token)
