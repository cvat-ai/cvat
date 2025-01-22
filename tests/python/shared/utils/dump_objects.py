# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from datetime import timezone
from http import HTTPStatus
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


if __name__ == "__main__":
    annotations = {}

    for obj in [
        "user",
        "project",
        "task",
        "job",
        "organization",
        "membership",
        "invitation",
        "cloudstorage",
        "comment",
        "issue",
        "webhook",
        "label",
        "quality/report",
        "quality/conflict",
        "quality/setting",
    ]:
        response = get_method("admin1", f"{obj}s", page_size="all")

        filename = f"{obj}s.json".replace("/", "_")
        with open(ASSETS_DIR / filename, "w") as f:
            f.write(json.dumps(clean_list_response(response.json()), indent=2, sort_keys=True))

        if obj in ["job", "task"]:
            annotations[obj] = {}
            for _obj in response.json()["results"]:
                oid = _obj["id"]

                response = get_method("admin1", f"{obj}s/{oid}/annotations")
                if response.status_code == HTTPStatus.OK:
                    annotations[obj][oid] = response.json()

    with open(ASSETS_DIR / "annotations.json", "w") as f:
        json.dump(annotations, f, indent=2, sort_keys=True)
