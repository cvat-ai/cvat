# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os.path as osp

from config import ASSETS_DIR, get_method

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
        "issue",
        "webhook",
    ]:
        response = get_method("admin1", f"{obj}s", page_size="all")
        with open(osp.join(ASSETS_DIR, f"{obj}s.json"), "w") as f:
            json.dump(response.json(), f, indent=2, sort_keys=True)

        if obj in ["job", "task"]:
            annotations[obj] = {}
            for _obj in response.json()["results"]:
                oid = _obj["id"]
                response = get_method("admin1", f"{obj}s/{oid}/annotations")
                annotations[obj][oid] = response.json()

    with open(osp.join(ASSETS_DIR, f"annotations.json"), "w") as f:
        json.dump(annotations, f, indent=2, sort_keys=True)
