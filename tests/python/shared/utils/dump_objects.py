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
Underscores in the file name are replaced with slashes in the URL path. If the default path for an
asset file is different, it can be overridden via the --asset-path argument.
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


def _parse_asset_url_path(s: str) -> tuple[str, str]:
    asset_filename, url_path = s.lower().rsplit(":", maxsplit=1)
    return asset_filename, url_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-dir", type=Path, default=ASSETS_DIR)
    parser.add_argument(
        "--asset-path",
        dest="asset_url_paths",
        default=[],
        action="append",
        type=_parse_asset_url_path,
        help="Repeatable, an override for the default inferred URL path for an asset. "
        "Format: '<asset filename without extension>:<url path after api/>'",
    )
    args = parser.parse_args()

    assets_dir: Path = args.assets_dir

    asset_url_paths: dict[str, str] = dict(args.asset_url_paths)

    annotations = {}
    access_tokens = {"user": {}}

    for dump_path in assets_dir.glob("*.json"):
        asset_name = dump_path.stem
        endpoint = asset_url_paths.get(asset_name, asset_name.replace("_", "/"))

        if asset_name in ("annotations", "access_tokens"):
            continue  # this will be handled at the end

        response = get_method("admin1", endpoint, page_size="all")

        with open(dump_path, "w") as f:
            json.dump(clean_list_response(response.json()), f, indent=2, sort_keys=True)

        if endpoint in ["jobs", "tasks"]:
            obj_type = endpoint.removesuffix("s")
            annotations[obj_type] = {}
            for obj in response.json()["results"]:
                oid = obj["id"]

                response = get_method("admin1", f"{endpoint}/{oid}/annotations")
                if response.status_code == HTTPStatus.OK:
                    annotations[obj_type][oid] = response.json()

        if endpoint == "users":
            obj_type = endpoint.removesuffix("s")
            for user in response.json()["results"]:
                response = get_method(
                    user["username"], "auth/access_tokens", page_size=100, sort="id"
                )
                if response.status_code == HTTPStatus.OK:
                    access_tokens[obj_type][user["username"]] = response.json()["results"]

    for filename, data in [
        ("annotations.json", annotations),
        ("access_tokens.json", access_tokens),
    ]:
        with open(assets_dir / filename, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
