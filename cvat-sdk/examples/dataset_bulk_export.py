# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Export many task datasets in one run: pick the tasks by project, by id, or by
status, write them locally and/or straight to a cloud storage, and record every
result in a CSV manifest.

A failing task does not stop the run - it is recorded in the manifest and the
script exits with code 1 at the end, so a pipeline still sees the failure.

Steps:
  1. Resolve the selection (--project-id, --task-id, --status).
  2. Export each task to --output-dir and/or to --cloud-storage-id, skipping the
     ones already exported when --skip-existing is passed.
  3. Write the manifest and report how many tasks were exported, skipped, failed.

With --jobs > 1 the exports run in worker threads. Each worker builds its OWN
client: a cvat_sdk Client is not safe to share between threads.

Usage (run ``python dataset_bulk_export.py --help`` for the full list of options):
  python dataset_bulk_export.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --output-dir datasets --jobs 4
  python dataset_bulk_export.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 10 11 12 --cloud-storage-id 3 --output-dir datasets
"""

import argparse
import csv
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location

_thread_state = threading.local()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument("--project-id", type=int, help="export every task of this project")
    parser.add_argument(
        "--task-id", type=int, nargs="+", metavar="ID", help="export these task ids"
    )
    parser.add_argument(
        "--status",
        choices=["annotation", "validation", "completed"],
        help="export only the tasks in this status",
    )
    parser.add_argument(
        "--output-dir", type=Path, help="directory to write the exported datasets to"
    )
    parser.add_argument(
        "--cloud-storage-id",
        type=int,
        help="also export straight to this registered cloud storage (see cloud_storage_register.py)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--jobs", type=int, default=1, help="number of parallel exports (default: %(default)s)"
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="skip tasks whose output file is already in --output-dir (resume a run)",
    )
    parser.add_argument("--with-images", action="store_true", help="include images in the exports")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("bulk_export.csv"),
        help="path to write the manifest to (default: %(default)s)",
    )
    return parser.parse_args()


def select_tasks(client, args: argparse.Namespace) -> list:
    """The tasks to export, as (id, name, status) triples."""
    if args.project_id:
        filters = {"project_id": args.project_id}
        if args.status:
            filters["status"] = args.status
        tasks = client.tasks.list(**filters)
        by_id = {task.id: task for task in tasks}
        if args.task_id:
            missing = [str(tid) for tid in args.task_id if tid not in by_id]
            if missing:
                sys.exit(f"Task id(s) {', '.join(missing)} not found in project {args.project_id}")
            tasks = [by_id[tid] for tid in args.task_id]
        return [(task.id, task.name, str(task.status)) for task in tasks]

    selected = []
    for task_id in args.task_id:
        try:
            task = client.tasks.retrieve(task_id)
        except Exception:
            selected.append((task_id, "", ""))
            continue
        if args.status and str(task.status) != args.status:
            continue
        selected.append((task.id, task.name, str(task.status)))
    return selected


def worker_client(host: str, token: str):
    """The calling thread's own client - never share one between threads."""
    client = getattr(_thread_state, "client", None)
    if client is None:
        client = _thread_state.client = make_client(host, access_token=token)
    return client


def export_one(args: argparse.Namespace, task_id: int, name: str, status: str) -> dict:
    row = {
        "task_id": task_id,
        "name": name,
        "status": status,
        "destination": "",
        "path": "",
        "bytes": "",
        "error": "",
    }
    local_path = args.output_dir / f"task_{task_id}.zip" if args.output_dir else None

    if args.skip_existing and local_path and local_path.exists():
        row["destination"] = "skipped"
        row["path"] = str(local_path)
        print(f"Skipped task {task_id} ({local_path} exists)")
        return row

    try:
        client = worker_client(args.host, args.token)
        task = client.tasks.retrieve(task_id)
        destinations = []

        if local_path:
            task.export_dataset(
                args.export_format,
                local_path,
                include_images=args.with_images,
                location=Location.LOCAL,
            )
            destinations.append("local")
            row["path"] = str(local_path)
            row["bytes"] = local_path.stat().st_size

        if args.cloud_storage_id:
            task.export_dataset(
                args.export_format,
                f"task_{task_id}.zip",
                include_images=args.with_images,
                location=Location.CLOUD_STORAGE,
                cloud_storage_id=args.cloud_storage_id,
            )
            destinations.append(f"cloud storage {args.cloud_storage_id}")

        row["destination"] = ", ".join(destinations)
        print(f"Exported task {task_id} {name!r} -> {row['destination']}")
    except Exception as error:  # one bad task must not abort the whole run
        row["error"] = f"{type(error).__name__}: {error}"
        print(f"FAILED task {task_id} {name!r}: {row['error']}")

    return row


def main() -> None:
    args = parse_args()
    if not args.project_id and not args.task_id:
        sys.exit("Select what to export: pass --project-id and/or --task-id")
    if not args.output_dir and not args.cloud_storage_id:
        sys.exit("Select a destination: pass --output-dir and/or --cloud-storage-id")
    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    with make_client(args.host, access_token=args.token) as client:
        selection = select_tasks(client, args)
    if not selection:
        sys.exit("The selection is empty; nothing to export")
    print(f"Exporting {len(selection)} task(s) with {args.jobs} worker(s)")

    if args.jobs > 1:
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            rows = list(pool.map(lambda task: export_one(args, *task), selection))
    else:
        rows = [export_one(args, *task) for task in selection]

    rows.sort(key=lambda row: row["task_id"])
    with args.output.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    failed = [row for row in rows if row["error"]]
    skipped = [row for row in rows if row["destination"] == "skipped"]
    exported = len(rows) - len(failed) - len(skipped)
    print(
        f"Exported {exported} of {len(rows)} task(s); {len(skipped)} skipped, {len(failed)} failed"
    )
    print(f"Wrote {args.output.resolve()}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
