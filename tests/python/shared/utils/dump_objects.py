# Copyright (C) 2022-2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import re
from http import HTTPStatus

from config import ASSETS_DIR, get_method


def clean_json(data: str) -> str:
    # truncate milliseconds to 3 digit precision to align with data.json
    data = re.sub(r'(\.\d{3})\d{3}Z"', r'\g<1>000Z"', data)
    data = data.rstrip()
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
            f.write(clean_json(json.dumps(response.json(), indent=2, sort_keys=True)))

        if obj in ["job", "task"]:
            annotations[obj] = {}
            for _obj in response.json()["results"]:
                oid = _obj["id"]

                response = get_method("admin1", f"{obj}s/{oid}/annotations")
                if response.status_code == HTTPStatus.OK:
                    annotations[obj][oid] = response.json()

    with open(ASSETS_DIR / "annotations.json", "w") as f:
        json.dump(annotations, f, indent=2, sort_keys=True)
