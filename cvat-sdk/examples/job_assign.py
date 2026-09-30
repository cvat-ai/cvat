# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Round-robin the unassigned jobs of a task across a set of annotators and
write a CSV report of the assignments (job_id, previous_assignee, new_assignee).

The user API supports server-side search within an organization, so you rarely
need to know user ids — pass usernames, or an organization and search query,
and let the recipe resolve them.

Steps:
  1. Resolve the assignee pool:
       --assignees USERNAME [USERNAME ...] : look up each username exactly.
       --search QUERY --org SLUG           : search organization members,
                                             print the matches, use them all.
       --search QUERY --org-id ID          : same, using the organization id.
       neither                             : assign to me (the authenticated user).
  2. Filter the task's unassigned jobs.
  3. Round-robin the jobs across the resolved users.
  4. Write assignments.csv into the current directory.

Usage (run ``python job_assign.py --help`` for the full list of options):
  python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42                              # self-assign
  python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --assignees alice bob
  python job_assign.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --task-id 42 --org 'annotators' --search 'annotator-team'
                                                  # pool = matches in the organization
"""

import argparse
import csv
import sys
from pathlib import Path

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F, all_, not_
from cvat_sdk.core.proxies.users import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--task-id", type=int, required=True, help="id of an existing task, e.g. 42"
    )
    organization = parser.add_mutually_exclusive_group()
    organization.add_argument(
        "--org", metavar="SLUG", help="organization slug to scope user and job queries"
    )
    organization.add_argument(
        "--org-id", type=int, metavar="ID", help="organization id to scope user and job queries"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--assignees",
        nargs="+",
        metavar="USERNAME",
        help="usernames to round-robin across (looked up exactly on the server)",
    )
    group.add_argument(
        "--search",
        metavar="QUERY",
        help="server-side search within --org/--org-id; every matching member becomes an assignee",
    )
    args = parser.parse_args()
    if args.search and args.org is None and args.org_id is None:
        parser.error("--search requires --org or --org-id")
    return args


def organization_filters(args: argparse.Namespace) -> dict[str, str | int]:
    if args.org is not None:
        return {"org": args.org}
    if args.org_id is not None:
        return {"org_id": args.org_id}
    return {}


def resolve_pool(client, args: argparse.Namespace) -> list[User]:
    """Resolve --assignees / --search / nothing to a list of User objects."""
    org_filters = organization_filters(args)
    if args.search:
        matches = client.users.list(search=args.search, **org_filters)
        if not matches:
            sys.exit(f"No users matched search {args.search!r}")
        print(f"Users matching {args.search!r}:")
        for user in matches:
            print(f"  {user.id}\t{user.username}")
        return matches

    if args.assignees:
        pool: list[User] = []
        for username in args.assignees:
            found = client.users.list(filter=F.username == username, **org_filters)
            if not found:
                sys.exit(f"User {username!r} not found")
            pool.append(found[0])
        return pool

    me = client.users.retrieve_current_user()
    print(f"No --assignees / --search; self-assigning as {me.username} (id={me.id})")
    return [me]


def main() -> None:
    args = parse_args()
    report_path = Path("assignments.csv")
    with make_client(args.host, access_token=args.token) as client:
        pool = resolve_pool(client, args)

        unassigned = client.jobs.list(
            filter=all_(F.task_id == args.task_id, not_(F.assignee.is_set())),
            **organization_filters(args),
        )
        print(f"Task {args.task_id}: {len(unassigned)} unassigned jobs to distribute")

        with report_path.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["job_id", "previous_assignee", "new_assignee", "new_assignee_id"])
            for i, job in enumerate(unassigned):
                user = pool[i % len(pool)]
                previous = job.assignee.username if job.assignee else ""
                job.update(models.PatchedJobWriteRequest(assignee=user.id))
                writer.writerow([job.id, previous, user.username, user.id])
                print(f"Assigned job {job.id} -> {user.username} (id={user.id})")

        print(f"Wrote {report_path.resolve()}")


if __name__ == "__main__":
    main()
