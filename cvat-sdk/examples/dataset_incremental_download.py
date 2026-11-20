# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Download a project's task data incrementally: the SDK keeps a local cache and
re-downloads only what the server has changed since the last run.

``cvat_sdk.datasets.TaskDataset`` stores each task under the client's cache
directory. On every construction it compares the cached copy's ``updated_date``
with the server's: an unchanged task is served entirely from disk, a changed one
is fetched again. Media chunks already on disk are never downloaded twice.

Two things worth knowing before building a pipeline on this:

* Staleness is tracked per task, not per frame. Any change to a task - an
  annotation edit included - invalidates that task's whole cache entry, so its
  media comes down again.
* Every run still asks the server for the task's metadata and labels; that is
  how it notices a change. Only the bulky parts - chunks and annotations - are
  skipped when the cache is fresh.

Steps:
  1. Resolve the tasks to download, from --project-id or from --task-id.
  2. Build a TaskDataset for each one, which fills or reuses the cache.
  3. Report the samples found and how much the cache grew.

Usage (run ``python dataset_incremental_download.py --help`` for the full list of options):
  python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --cache-dir ./cvat-cache
  # run the same command again: the cache does not grow and no media is fetched
  python dataset_incremental_download.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 10 11 --cache-dir ./cvat-cache --offline
"""

import argparse
import logging
import sys
from pathlib import Path

from cvat_sdk import Client, make_client
from cvat_sdk.core.client import AccessTokenCredentials
from cvat_sdk.datasets import TaskDataset, UnsupportedDatasetError, UpdatePolicy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument(
        "--project-id", type=int, help="download every task of this project, e.g. 7"
    )
    selection.add_argument(
        "--task-id", type=int, nargs="+", metavar="ID", help="download these task ids"
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        help="where to keep the downloaded data (default: the SDK's per-user cache directory)",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="read the cache without contacting the server; fails on anything not cached",
    )
    parser.add_argument(
        "--quiet", action="store_true", help="hide the SDK's per-file cache and download messages"
    )
    return parser.parse_args()


def connect(args: argparse.Namespace) -> Client:
    """The client to work through.

    An --offline run must make no requests at all, so it skips the server
    version handshake that Client performs on construction. Applying an access
    token needs no round trip either, which is what makes this possible.
    """
    if not args.offline:
        return make_client(args.host, access_token=args.token)

    client = Client(url=args.host, check_server_version=False)
    client.login(AccessTokenCredentials(args.token))
    return client


def cache_size(path: Path) -> int:
    """Bytes currently cached under path, which need not exist yet."""
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def main() -> None:
    args = parse_args()
    if args.offline and not args.task_id:
        sys.exit("--offline needs --task-id: listing a project's tasks is itself a server call")

    logging.basicConfig(level=logging.WARNING if args.quiet else logging.INFO, format="%(message)s")

    with connect(args) as client:
        if args.cache_dir:
            client.config.cache_dir = args.cache_dir
        cache_dir = client.config.cache_dir
        print(f"Cache: {cache_dir}")
        size_before = cache_size(cache_dir)

        if args.task_id:
            task_ids = args.task_id
        else:
            task_ids = [task.id for task in client.tasks.list(project_id=args.project_id)]
            if not task_ids:
                sys.exit(f"Project {args.project_id} has no tasks to download")

        policy = UpdatePolicy.NEVER if args.offline else UpdatePolicy.IF_MISSING_OR_STALE
        downloaded = 0
        for task_id in task_ids:
            try:
                dataset = TaskDataset(client, task_id, update_policy=policy)
            except UnsupportedDatasetError as error:
                # A video task, or a task with no data. One such task must not
                # stop the rest of the selection from being downloaded.
                print(f"Skipped task {task_id}: {error}")
                continue
            except FileNotFoundError:
                print(f"Skipped task {task_id}: not in the cache, run without --offline first")
                continue
            downloaded += 1
            print(
                f"Task {task_id}: {len(dataset.samples)} sample(s), {len(dataset.labels)} label(s)"
            )

        grew = cache_size(cache_dir) - size_before
        print(f"{downloaded} of {len(task_ids)} task(s) available locally; cache grew by {grew} B")

    if not downloaded:
        sys.exit(1)


if __name__ == "__main__":
    main()
