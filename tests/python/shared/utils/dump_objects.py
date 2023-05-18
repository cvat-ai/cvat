# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus

from config import ASSETS_DIR, get_method

if __name__ == "__main__":
    annotations = {}
    quality_settings = {}

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
    ]:
        response = get_method("admin1", f"{obj}s", page_size="all")

        filename = f"{obj}s.json".replace("/", "_")
        with open(ASSETS_DIR / filename, "w") as f:
            json.dump(response.json(), f, indent=2, sort_keys=True)

        if obj in ["job", "task"]:
            annotations[obj] = {}
            for _obj in response.json()["results"]:
                oid = _obj["id"]

                response = get_method("admin1", f"{obj}s/{oid}/annotations")
                if response.status_code == HTTPStatus.OK:
                    annotations[obj][oid] = response.json()

                if obj == "task":
                    sid = _obj["quality_settings"]
                    response = get_method("admin1", f"quality/settings/{sid}")
                    if response.status_code == HTTPStatus.OK:
                        quality_settings[sid] = response.json()

    with open(ASSETS_DIR / "annotations.json", "w") as f:
        json.dump(annotations, f, indent=2, sort_keys=True)

    with open(ASSETS_DIR / "quality_settings.json", "w") as f:
        json.dump(quality_settings, f, indent=2, sort_keys=True)
