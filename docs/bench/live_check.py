"""
End-to-end check of item 8 without a browser.

Opens the stats WebSocket for a task as `user`, adds one rectangle to the task's first job
through CVAT's own annotations API, and times how long the "changed" message takes to arrive.
Also checks that a forged ticket and a ticket for another task are refused.

Usage: python docs/bench/live_check.py <task_id> <username> <password> [base_url]
"""

import asyncio
import json
import sys
import time
import urllib.request

import websockets

task_id, username, password = int(sys.argv[1]), sys.argv[2], sys.argv[3]
base = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:8080"
ws_base = base.replace("http", "ws", 1)


def call(method, path, token=None, body=None):
    request = urllib.request.Request(
        base + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"}
        | ({"Authorization": f"Token {token}"} if token else {}),
    )
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read() or "null")


async def refused(url):
    try:
        async with websockets.connect(url):
            return False
    except websockets.InvalidStatus as error:
        return error.response.status_code


async def main():
    token = call("POST", "/api/auth/login", body={"username": username, "password": password})[
        "key"
    ]
    stats = call("GET", f"/api/annotation-stats/{task_id}", token)
    url = f"{ws_base}/api/annotation-stats/{task_id}/ws?ticket="

    print("forged ticket refused, HTTP", await refused(url + "forged"))
    print(
        "ticket for another task refused, HTTP",
        await refused(
            f"{ws_base}/api/annotation-stats/{task_id + 1}/ws?ticket={stats['ws_ticket']}"
        ),
    )

    job = call("GET", f"/api/jobs?task_id={task_id}", token)["results"][0]
    label_id = stats["labels"][0]["id"]
    box = {
        "type": "rectangle",
        "frame": job["start_frame"],
        "label_id": label_id,
        "points": [10, 10, 60, 60],
        "attributes": [],
        "group": 0,
        "source": "manual",
    }

    async with websockets.connect(url + stats["ws_ticket"]) as socket:
        print("connected with the REST ticket")
        started = time.perf_counter()
        await asyncio.to_thread(
            call,
            "PATCH",
            f"/api/jobs/{job['id']}/annotations?action=create",
            token,
            {"shapes": [box], "tracks": [], "tags": []},
        )
        message = await asyncio.wait_for(socket.recv(), timeout=10)
        print(
            f"received {message} {(time.perf_counter() - started) * 1000:.0f} ms after the PATCH was sent"
        )

    after = call("GET", f"/api/annotation-stats/{task_id}", token)
    print(f"total before {stats['total']}, after {after['total']}")


asyncio.run(main())
