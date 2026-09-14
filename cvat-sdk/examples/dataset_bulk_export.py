# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Export many task datasets in one run: name the tasks by id, optionally
narrowed by status, write them locally and/or straight to a cloud storage, and
record every result in a CSV manifest.

A failing task does not stop the run - it is recorded in the manifest and the
script exits with code 1 at the end, so a pipeline still sees the failure.

Steps:
  1. Check --cloud-storage-id once, so a wrong id fails before any export, and
     resolve the selection (--task-id, --status). Check that every selected
     task belongs to the cloud storage's workspace before exporting anything.
  2. Export each task to --output-dir and/or to --cloud-storage-id, skipping the
     ones already exported when --skip-existing is passed.
  3. Append a manifest row after every task - a run stopped with Ctrl+C still
     leaves a manifest of what it managed to export - and report how many tasks
     were exported, skipped, failed.

Usage (run ``python dataset_bulk_export.py --help`` for the full list of options):
  python dataset_bulk_export.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 10 11 12 --output-dir datasets
  python dataset_bulk_export.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 10 11 12 --cloud-storage-id 3 --output-dir datasets
"""

import argparse
import csv
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.types import Location

MANIFEST_FIELDS = ("task_id", "name", "status", "destination", "path", "bytes", "error")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--task-id",
        type=int,
        nargs="+",
        metavar="ID",
        required=True,
        help="export these task ids",
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
        help="also export straight to this registered cloud storage, checked before "
        "the run starts (see cloud_storage_register.py)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="skip tasks whose output file is already in --output-dir (resume a run); "
        "local exports only",
    )
    parser.add_argument("--with-images", action="store_true", help="include images in the exports")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("bulk_export.csv"),
        help="path to write the CSV manifest to (default: %(default)s)",
    )
    return parser.parse_args()


def select_tasks(
    client, args: argparse.Namespace, storage: models.CloudStorageRead | None = None
) -> list:
    """The tasks to export, as (id, name, status) triples.

    --status is applied after the ids are resolved, so a task that exists but is
    in another status is reported as filtered out rather than as missing - two
    different mistakes.
    """
    selected = []
    for task_id in args.task_id:
        try:
            task = client.tasks.retrieve(task_id)
        except Exception:
            selected.append((task_id, "", ""))
            continue
        if args.status and str(task.status) != args.status:
            print(f"Skipping task {task_id}: status is {task.status}, not {args.status}")
            continue
        if storage is not None and task.organization_id != storage.organization:
            sys.exit(
                f"Task {task_id} and cloud storage {storage.id} belong to different workspaces"
            )
        selected.append((task.id, task.name, str(task.status)))
    return selected


def export_one(client, args: argparse.Namespace, task_id: int, name: str, status: str) -> dict:
    row = dict.fromkeys(MANIFEST_FIELDS, "")
    row.update(task_id=task_id, name=name, status=status)
    local_path = args.output_dir / f"task_{task_id}.zip" if args.output_dir else None

    if args.skip_existing and local_path and local_path.exists():
        row["destination"] = "skipped"
        row["path"] = str(local_path)
        print(f"Skipped task {task_id} ({local_path} exists)")
        return row

    try:
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
    if not args.output_dir and not args.cloud_storage_id:
        sys.exit("Select a destination: pass --output-dir and/or --cloud-storage-id")
    if args.skip_existing and not args.output_dir:
        sys.exit("--skip-existing needs --output-dir: a cloud export leaves nothing local to check")
    if args.skip_existing and args.cloud_storage_id:
        sys.exit("--skip-existing cannot resume a cloud export; drop it or drop --cloud-storage-id")
    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    with make_client(args.host, access_token=args.token) as client:
        storage = None
        if args.cloud_storage_id:
            try:
                storage, _ = client.api_client.cloudstorages_api.retrieve(args.cloud_storage_id)
            except Exception as error:
                sys.exit(
                    f"Cloud storage {args.cloud_storage_id} is not available to this user: {error}"
                )
            print(f"Exporting to cloud storage {storage.id} {storage.display_name!r}")

        selection = select_tasks(client, args, storage)
        if not selection:
            sys.exit("The selection is empty; nothing to export")
        print(f"Exporting {len(selection)} task(s)")

        rows = []
        with args.manifest.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=MANIFEST_FIELDS)
            writer.writeheader()
            for task in selection:
                row = export_one(client, args, *task)
                # Written and flushed one task at a time, so Ctrl+C halfway
                # through still leaves a usable manifest on disk.
                writer.writerow(row)
                f.flush()
                rows.append(row)

    failed = [row for row in rows if row["error"]]
    skipped = [row for row in rows if row["destination"] == "skipped"]
    exported = len(rows) - len(failed) - len(skipped)
    print(
        f"Exported {exported} of {len(rows)} task(s); {len(skipped)} skipped, {len(failed)} failed"
    )
    print(f"Wrote {args.manifest.resolve()}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
