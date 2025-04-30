# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
This script lists resources on the CVAT server
and saves them to JSON files in the `assets` directory.
Before running it, start the test instance by running:

    pytest tests/python --start-services

The script determines which endpoints to query by looking at the set of existing JSON files.
For example, if `tasks.json` exists, the script will overwrite it with output of `GET /api/tasks`.
Underscores in the file name are replaced with slashes in the URL path.
In addition, `annotations.json` is always saved.
"""

import argparse
import json
from datetime import timezone
from http import HTTPStatus
from pathlib import Path
from typing import Any

from config import ASSETS_DIR, get_method
from dateutil.parser import ParserError, parse


def clean_list_response(data: dict[str, Any]) -> dict[str, Any]:
    # truncate milliseconds to 3 digit precision to align with data.json
    # "2023-03-30T09:37:31.615123Z" ->
    # "2023-03-30T09:37:31.615000Z"

    for result in data["results"]:
        for k, v in result.items():
            if not isinstance(v, str):
                continue

            try:
                parsed_date = parse(v)
            except ParserError:
                continue

            parsed_date = parsed_date.replace(
                microsecond=parsed_date.microsecond - (parsed_date.microsecond % 1000)
            )
            result[k] = parsed_date.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-dir", type=Path, default=ASSETS_DIR)
    args = parser.parse_args()

    assets_dir: Path = args.assets_dir

    annotations = {}

    for dump_path in assets_dir.glob("*.json"):
        endpoint = dump_path.stem.replace("_", "/")

        if endpoint == "annotations":
            continue  # this will be handled at the end

        response = get_method("admin1", endpoint, page_size="all")

        with open(dump_path, "w") as f:
            json.dump(clean_list_response(response.json()), f, indent=2, sort_keys=True)

        if endpoint in ["jobs", "tasks"]:
            obj = endpoint.removesuffix("s")
            annotations[obj] = {}
            for _obj in response.json()["results"]:
                oid = _obj["id"]

                response = get_method("admin1", f"{endpoint}/{oid}/annotations")
                if response.status_code == HTTPStatus.OK:
                    annotations[obj][oid] = response.json()

    with open(assets_dir / "annotations.json", "w") as f:
        json.dump(annotations, f, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
