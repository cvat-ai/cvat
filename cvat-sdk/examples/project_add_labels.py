# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Add labels, optionally with selectable attributes, to an existing project.

Steps:
  1. Retrieve the project and read the labels it already has; the requested
     labels that already exist are skipped, so the script is safe to re-run.
  2. Attach the --attr definitions to their new labels.
  3. Send one project update with the new labels. Labels of the tasks inside
     the project come from the project itself, so they all pick up the change.

Usage (run ``python project_add_labels.py --help`` for the full list of options):
  python project_add_labels.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --labels car person
  python project_add_labels.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --project-id 7 --labels car --attr car color red green blue
"""

import argparse

from cvat_sdk import make_client, models


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
        "--labels", nargs="+", metavar="NAME", required=True, help="label names to add"
    )
    parser.add_argument(
        "--attr",
        nargs="+",
        action="append",
        default=[],
        metavar=("LABEL NAME", "VALUE"),
        help="selectable attribute for one of the --labels: label name, attribute "
        "name, then its values (repeat --attr for more attributes)",
    )
    args = parser.parse_args()
    for attr in args.attr:
        if len(attr) < 3:
            parser.error("--attr needs a label, an attribute name, and at least one value")
        if attr[0] not in args.labels:
            parser.error(f"--attr refers to label {attr[0]!r}, which is not in --labels")
    return args


def main() -> None:
    args = parse_args()
    attributes_per_label: dict[str, list[models.AttributeRequest]] = {}
    for label_name, attribute_name, *values in args.attr:
        attributes_per_label.setdefault(label_name, []).append(
            models.AttributeRequest(
                name=attribute_name,
                input_type=models.InputTypeEnum("select"),
                values=values,
                default_value=values[0],
                mutable=True,
            )
        )

    with make_client(args.host, access_token=args.token) as client:
        project = client.projects.retrieve(args.project_id)
        existing = {label.name for label in project.get_labels()}

        new_labels = []
        for name in args.labels:
            if name in existing:
                print(f"Label {name!r} already exists, skipping")
                continue
            new_labels.append(
                models.PatchedLabelRequest(name=name, attributes=attributes_per_label.get(name, []))
            )

        if new_labels:
            project.update(models.PatchedProjectWriteRequest(labels=new_labels))
        print(
            f"Added {len(new_labels)} labels to project {project.id}: "
            f"{', '.join(label.name for label in new_labels) or '-'}"
        )
        print(f"Project {project.id} labels: {[label.name for label in project.get_labels()]}")


if __name__ == "__main__":
    main()
