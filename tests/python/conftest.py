# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from hashlib import sha1
from collections import defaultdict

import pytest
from shared.fixtures import init as infra_init

# Force execution of fixture definitions
from shared.fixtures.data import *  # pylint: disable=wildcard-import
from shared.fixtures.init import *  # pylint: disable=wildcard-import
from shared.fixtures.parallel_runtime import (
    PARALLEL_PROFILES,
    PROFILE_ORDER,
    assigned_lane_index,
    parse_parallel_profiles,
)
from shared.fixtures.util import *  # pylint: disable=wildcard-import

def _emit_parallel_event(events_file: str, payload: dict) -> None:
    if not events_file:
        return
    with open(events_file, "a") as f:
        f.write(json.dumps(payload) + "\n")


def _required_infra_profile(item) -> str:
    explicit_marker = item.get_closest_marker("infra_profile")
    if explicit_marker:
        if explicit_marker.args:
            return explicit_marker.args[0]
        return "core"

    return "core"


def _lane_supports(required: str, lane_profile: str) -> bool:
    return PROFILE_ORDER[lane_profile] >= PROFILE_ORDER[required]


def _parallel_group_key(item) -> str:
    """
    Group tests for deterministic lane assignment.

    Default behavior groups by case (best balancing).
    Supported modes:
    - "class" (default): class methods are grouped by class
    - "function": parametrized variants are grouped by test function
    - "case": each test case (full nodeid, including params) is independent
    """
    parts = item.nodeid.split("::")
    grouping_marker = item.get_closest_marker("parallel_group")
    grouping = str(grouping_marker.args[0]).lower() if grouping_marker and grouping_marker.args else "case"

    if grouping == "case":
        return item.nodeid

    if len(parts) >= 3 and "[" not in parts[1]:
        if grouping == "function":
            # module::Class::test_method[...] -> module::Class::test_method
            return "::".join([parts[0], parts[1], parts[2].split("[", 1)[0]])
        # module::Class::test_method[...] -> module::Class
        return "::".join([parts[0], parts[1]])

    if len(parts) >= 2:
        # Top-level tests are grouped by function.
        return "::".join([parts[0], parts[1].split("[", 1)[0]])

    return item.nodeid.split("[", 1)[0]


def _stable_shuffle_key(value: str, seed: int | None) -> tuple[str, str]:
    # Deterministic pseudo-randomization independent from Python hash seed.
    if seed is None:
        material = value
    else:
        material = f"{seed}:{value}"
    return sha1(material.encode("utf-8")).hexdigest(), value


class _ParallelEventPlugin:
    def __init__(self, events_file: str):
        self._events_file = events_file

    def pytest_runtest_logreport(self, report) -> None:
        _emit_parallel_event(
            self._events_file,
            {
                "type": "report",
                "report": report._to_json(),
            },
        )

    def pytest_runtest_logstart(self, nodeid: str, location) -> None:
        _emit_parallel_event(
            self._events_file,
            {
                "type": "logstart",
                "nodeid": nodeid,
                "location": list(location) if location else None,
            },
        )

    def pytest_runtest_logfinish(self, nodeid: str, location) -> None:
        _emit_parallel_event(
            self._events_file,
            {
                "type": "logfinish",
                "nodeid": nodeid,
                "location": list(location) if location else None,
            },
        )


def pytest_configure(config) -> None:
    infra_init._preconfigure_runtime_env(config)
    events_file = str(config.getoption("--parallel-events-file") or "")
    plugin_name = "cvat_parallel_event_plugin"
    if config.pluginmanager.get_plugin(plugin_name) is None:
        config.pluginmanager.register(_ParallelEventPlugin(events_file), plugin_name)


def pytest_collection_modifyitems(config, items) -> None:
    events_file = str(config.getoption("--parallel-events-file") or "")
    shuffle_seed = config.getoption("--parallel-shuffle-seed")
    target_profile = str(config.getoption("--infra-profile"))
    is_parallel_child = bool(config.getoption("--parallel-child"))
    lane_index = int(config.getoption("--parallel-lane-index"))

    lanes_raw = str(config.getoption("--parallel-lane-profiles") or "")
    lane_profiles = parse_parallel_profiles(lanes_raw, PARALLEL_PROFILES) if lanes_raw else []
    if not lane_profiles and not is_parallel_child:
        parent_parallel = str(config.getoption("--parallel") or "")
        lane_profiles = (
            parse_parallel_profiles(parent_parallel, PARALLEL_PROFILES)
            if parent_parallel
            else []
        )
    if lane_profiles and not is_parallel_child:
        # Parent process should expose collection/progress for tests that are runnable
        # under the provided parallel lane set, i.e. up to the maximum profile.
        target_profile = max(lane_profiles, key=lambda p: PROFILE_ORDER[p])
    if is_parallel_child and not lane_profiles:
        lane_profiles = [str(config.getoption("--parallel-lane-profile"))]

    selected = []
    deselected = []
    lane_loads = [0] * len(lane_profiles) if is_parallel_child else []
    lane_by_nodeid: dict[str, int] = {}
    required_by_nodeid: dict[str, str] = {}

    for item in items:
        required = _required_infra_profile(item)
        if required not in PROFILE_ORDER:
            raise pytest.UsageError(
                f"Unknown infra profile '{required}' in marker for test '{item.nodeid}'"
            )
        required_by_nodeid[item.nodeid] = required

    if is_parallel_child:
        # By default, keep class tests together to preserve implicit ordering/
        # state assumptions inside classes. Tests can opt into finer-grained
        # balancing via @pytest.mark.parallel_group("function"/"case").
        grouped_items: dict[tuple[str, str], list] = defaultdict(list)
        for item in items:
            group_key = _parallel_group_key(item)
            required = required_by_nodeid[item.nodeid]
            grouped_items[(group_key, required)].append(item)

        # Assign constrained profiles first (full -> extended -> core),
        # then balance each bucket by least-loaded eligible lane.
        required_order = ("full", "extended", "core")
        grouped_by_required: dict[str, list[tuple[str, str]]] = {
            required: [] for required in required_order
        }
        for grouped_key in grouped_items:
            grouped_by_required[grouped_key[1]].append(grouped_key)

        for required in required_order:
            for grouped_key in sorted(
                grouped_by_required[required],
                key=lambda key: _stable_shuffle_key(f"{key[0]}|{key[1]}", shuffle_seed),
            ):
                module_items = grouped_items[grouped_key]
                _, module_required = grouped_key
                lane = assigned_lane_index(module_required, lane_profiles, lane_loads)
                if lane >= 0:
                    lane_loads[lane] += len(module_items)
                for item in module_items:
                    lane_by_nodeid[item.nodeid] = lane

    for item in items:
        required = required_by_nodeid[item.nodeid]
        item.add_marker(pytest.mark.infra_profile(required))
        item.add_marker(getattr(pytest.mark, f"infra_required_{required}"))

        if is_parallel_child:
            if lane_by_nodeid[item.nodeid] != lane_index:
                deselected.append(item)
                continue
        elif not _lane_supports(required, target_profile):
            deselected.append(item)
            continue

        selected.append(item)

    if deselected:
        config.hook.pytest_deselected(items=deselected)
    items[:] = selected

    _emit_parallel_event(
        events_file,
        {
            "type": "collected",
            "selected": len(selected),
            "deselected": len(deselected),
        }
    )
