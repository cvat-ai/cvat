# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Create a project with labels, then list, filter, retrieve, and rename it.

Steps:
  1. Create a project with a simple label schema.
  2. List all projects visible to you (pagination is handled by the SDK).
  3. Filter projects by a name substring.
  4. Retrieve one project by id and read its labels.
  5. Rename it.
  6. Optionally delete it (--cleanup).

Usage (run ``python project_create_and_list.py --help`` for the full list of options):
  python project_create_and_list.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --name 'My project' --labels car person
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.filters import F


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument(
        "--name", default="Example project", help="project name (default: '%(default)s')"
    )
    parser.add_argument(
        "--labels",
        nargs="+",
        default=["car", "person"],
        help="label names (default: %(default)s)",
    )
    parser.add_argument(
        "--cleanup", action="store_true", help="delete the created project at the end"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        # 1. Create a project with labels
        project = client.projects.create(
            models.ProjectWriteRequest(
                name=args.name,
                labels=[models.PatchedLabelRequest(name=name) for name in args.labels],
            )
        )
        print(f"Created project {project.id}: {args.host}/projects/{project.id}")

        # 2. List all projects
        projects = client.projects.list()
        print(f"Projects visible to you: {len(projects)}")

        # 3. Filter by name substring
        matches = client.projects.list(filter=F.name.contains(args.name))
        print(f"Projects with {args.name!r} in the name: {[p.id for p in matches]}")

        # 4. Retrieve by id
        fetched = client.projects.retrieve(project.id)
        print(f"Project {fetched.id} labels: {[label.name for label in fetched.get_labels()]}")

        # 5. Rename
        renamed = fetched.update(models.PatchedProjectWriteRequest(name=f"{args.name} (renamed)"))
        print(f"Renamed to: {renamed.name}")

        # 6. Opt-in cleanup
        if args.cleanup:
            renamed.remove()
            print(f"Deleted project {project.id}")
        else:
            print("Keeping the project; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
