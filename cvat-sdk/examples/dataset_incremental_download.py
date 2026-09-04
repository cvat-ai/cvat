# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Download a project's task datasets incrementally: export only the tasks that
changed since the previous run, tracked in a local state file.

Steps:
  1. Load the state file (or start from scratch) and check it belongs to this
     server and project.
  2. Ask the server for the tasks updated after the last run - the
     ``updated_date__gt`` lookup becomes a server-side filter - and add any task
     that the state file has never seen.
  3. Report state entries whose tasks no longer exist on the server.
  4. Export each selected task, saving the state right after every successful
     export, so an interrupted run resumes instead of downloading everything again.

Usage (run ``python dataset_incremental_download.py --help`` for the full list of options):
  python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --output-dir datasets --state incremental_state.json
"""

import argparse
import json
import sys
from pathlib import Path

from cvat_sdk import make_client
from cvat_sdk.core.proxies.types import Location


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--project-id", type=int, required=True, help="id of an existing project, e.g. 7"
    )
    parser.add_argument(
        "--state",
        type=Path,
        default=Path("incremental_state.json"),
        help="file that remembers what was downloaded (default: %(default)s)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("datasets"),
        help="directory to write the exported datasets to (default: %(default)s)",
    )
    parser.add_argument(
        "--export-format",
        default="COCO 1.0",
        help="exporter name, e.g. 'COCO 1.0' (default: '%(default)s')",
    )
    parser.add_argument(
        "--with-images",
        action="store_true",
        help="include images in the exported datasets (slower, much larger)",
    )
    return parser.parse_args()


def load_state(path: Path, host: str, project_id: int) -> dict:
    """The previous run's result, or an empty state for the first run."""
    if not path.exists():
        return {"server": host, "project_id": project_id, "last_sync": None, "tasks": {}}

    state = json.loads(path.read_text())
    if state.get("server") != host or state.get("project_id") != project_id:
        sys.exit(
            f"State file {path} belongs to project {state.get('project_id')} "
            f"on {state.get('server')!r}. Use a different --state file."
        )
    return state


def save_state(path: Path, state: dict) -> None:
    path.write_text(json.dumps(state, indent=2, sort_keys=True))


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        state = load_state(args.state, args.host, args.project_id)
        known = state["tasks"]
        last_sync = state["last_sync"]

        # 2. What is on the server now, and what of it changed since the last run.
        tasks = client.tasks.list(project_id=args.project_id)
        if last_sync:
            # The `field__op` keyword becomes a server-side filter, so the server
            # does the comparison and only the changed tasks come back.
            changed_ids = {
                task.id
                for task in client.tasks.list(
                    project_id=args.project_id, updated_date__gt=last_sync
                )
            }
        else:
            changed_ids = {task.id for task in tasks}

        selected = [task for task in tasks if task.id in changed_ids or str(task.id) not in known]

        # 3. Tasks that were downloaded before and are gone now.
        for task_id in sorted(set(known) - {str(task.id) for task in tasks}, key=int):
            print(f"Task {task_id} no longer exists on the server (kept in {args.state})")

        if not selected:
            print(f"Nothing changed since {last_sync}")
            return

        # 4. Export, remembering each success immediately.
        args.output_dir.mkdir(parents=True, exist_ok=True)
        for task in selected:
            path = args.output_dir / f"task_{task.id}.zip"
            path.unlink(missing_ok=True)
            task.export_dataset(
                args.export_format,
                path,
                include_images=args.with_images,
                location=Location.LOCAL,
            )
            print(f"Exported task {task.id} {task.name!r} -> {path.resolve()}")

            known[str(task.id)] = task.updated_date.isoformat()
            state["last_sync"] = max(filter(None, [state["last_sync"], known[str(task.id)]]))
            save_state(args.state, state)

        print(f"Downloaded {len(selected)} task dataset(s) into {args.output_dir.resolve()}")
        print(f"State written to {args.state.resolve()}")


if __name__ == "__main__":
    main()
