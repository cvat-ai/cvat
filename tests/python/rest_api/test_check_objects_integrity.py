# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from pathlib import Path

import pytest
from deepdiff import DeepDiff

from shared.utils import config


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetResources:
    @pytest.mark.parametrize("path", config.ASSETS_DIR.glob("*.json"))
    def test_check_objects_integrity(self, path: Path):
        with open(path) as f:
            endpoint = path.stem
            if endpoint in ["quality_settings", "quality_reports", "quality_conflicts"]:
                endpoint = "/".join(endpoint.split("_"))

            if endpoint == "annotations":
                objects = json.load(f)
                for jid, annotations in objects["job"].items():
                    response = config.get_method("admin1", f"jobs/{jid}/annotations").json()
                    assert (
                        DeepDiff(
                            annotations,
                            response,
                            ignore_order=True,
                            exclude_paths="root['version']",
                        )
                        == {}
                    )
            else:
                response = config.get_method("admin1", endpoint, page_size="all")
                json_objs = json.load(f)
                resp_objs = response.json()

                assert (
                    DeepDiff(
                        json_objs,
                        resp_objs,
                        ignore_order=True,
                        exclude_regex_paths=r"root\['results'\]\[\d+\]\['last_login'\]",
                    )
                    == {}
                )
