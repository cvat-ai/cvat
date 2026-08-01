# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from pathlib import Path
from typing import Any, Callable

import pytest

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
