# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
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
            if endpoint in [
                "quality_settings",
                "quality_reports",
                "quality_conflicts",
                "consensus_settings",
            ]:
                endpoint = "/".join(endpoint.split("_"))
            elif endpoint == "access_tokens":
                endpoint = "auth/access_tokens"

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
            elif endpoint == "auth/access_tokens":
                objects = json.load(f)
                assert set(objects) == {"user"}

                for username, tokens in objects["user"].items():
                    response = config.get_paginated_collection(username, "auth/access_tokens")
                    assert (
                        DeepDiff(
                            tokens,
                            response,
                            ignore_order=True,
                        )
                        == {}
                    )
            else:
                request_params = {}
                if endpoint == "quality/reports":
                    request_params["include_legacy"] = "true"

                resp_results = config.get_paginated_collection("admin1", endpoint, **request_params)
                json_objs = json.load(f)

                if endpoint == "quality/settings":
                    for collection in (json_objs["results"], resp_results):
                        for settings in collection:
                            settings.pop("updated_date", None)
                            for requirement in settings.get("requirements", []):
                                requirement.pop("created_date", None)
                                requirement.pop("updated_date", None)

                assert (
                    DeepDiff(
                        json_objs["results"],
                        resp_results,
                        ignore_order=True,
                        exclude_regex_paths=[
                            r"root\[\d+\]\['last_login'\]",
                        ],
                    )
                    == {}
                )
