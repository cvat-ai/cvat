# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import copy
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from scripts.check_fixture_inventory import FixtureInventoryError, validate_inventory

FixtureInventory = dict[str, Any]
FixtureMutation = Callable[[dict[str, Any]], object]


@pytest.fixture(name="project_root")
def fixture_project_root() -> Path:
    return Path(__file__).resolve().parents[1]


@pytest.fixture(name="inventory")
def fixture_inventory(project_root: Path) -> FixtureInventory:
    inventory_path = project_root / "tests" / "fixtures" / "inventory.json"
    with inventory_path.open(encoding="utf-8") as inventory_file:
        return json.load(inventory_file)


def test_fixture_inventory_is_complete_and_matches_generated_bytes(
    inventory: FixtureInventory,
    project_root: Path,
) -> None:
    validate_inventory(inventory, project_root)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda fixture: fixture.pop("sha256"),
        lambda fixture: fixture.update(source={}),
        lambda fixture: fixture["redistribution_permission"].update(status="pending"),
    ],
    ids=["missing-checksum", "missing-provenance", "unapproved-redistribution"],
)
def test_fixture_inventory_rejects_incomplete_assets(
    inventory: FixtureInventory,
    project_root: Path,
    mutate: FixtureMutation,
) -> None:
    incomplete_inventory = copy.deepcopy(inventory)
    mutate(incomplete_inventory["fixtures"][0])

    with pytest.raises(FixtureInventoryError):
        validate_inventory(incomplete_inventory, project_root)
