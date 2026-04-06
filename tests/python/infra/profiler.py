# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import os
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any

import pytest

from infra.config import RuntimeInfraConfig

_EXTERNAL_PHASE_SECONDS: defaultdict[str, float] = defaultdict(float)


def record_external_phase(name: str, duration_s: float) -> None:
    _EXTERNAL_PHASE_SECONDS[str(name)] += float(duration_s)


@contextmanager
def profile_external_phase(name: str):
    start = perf_counter()
    try:
        yield
    finally:
        record_external_phase(name, perf_counter() - start)


@dataclass
class _FixtureStat:
    name: str
    scope: str
    location: str
    setup_count: int = 0
    setup_total: float = 0.0
    setup_max: float = 0.0
    teardown_count: int = 0
    teardown_total: float = 0.0
    teardown_max: float = 0.0


@dataclass
class _TestStat:
    nodeid: str
    outcome: str = "unknown"
    phases: dict[str, dict[str, float]] | None = None

    def __post_init__(self) -> None:
        if self.phases is None:
            self.phases = {}


class RuntimeProfilerPlugin:
    def __init__(self, config):
        self._config = config
        self._session_start = perf_counter()
        self._session_start_wall = datetime.now(timezone.utc)
        self._collection_start: float | None = None
        self._collection_end: float | None = None
        self._tests_collected = 0

        self._reports = {"setup": 0.0, "call": 0.0, "teardown": 0.0}
        self._report_counts = {"setup": 0, "call": 0, "teardown": 0}
        self._outcomes = defaultdict(int)

        self._fixtures: dict[tuple[str, str, str], _FixtureStat] = {}
        self._tests: dict[str, _TestStat] = {}
        self._written = False

    def pytest_collection(self):
        self._collection_start = perf_counter()

    def pytest_collection_modifyitems(self, config, items):
        self._collection_end = perf_counter()
        self._tests_collected = len(items)

    @pytest.hookimpl(hookwrapper=True)
    def pytest_fixture_setup(self, fixturedef, request):
        key = self._fixture_key(fixturedef)
        stat = self._fixtures.get(key)
        if stat is None:
            stat = _FixtureStat(name=key[0], scope=key[1], location=key[2])
            self._fixtures[key] = stat

        start = perf_counter()
        outcome = yield
        outcome.get_result()
        duration = perf_counter() - start
        stat.setup_count += 1
        stat.setup_total += duration
        stat.setup_max = max(stat.setup_max, duration)

    def pytest_runtest_logreport(self, report):
        when = str(report.when)
        if when in self._reports:
            duration = float(report.duration or 0.0)
            self._reports[when] += duration
            self._report_counts[when] += 1

            test = self._tests.get(report.nodeid)
            if test is None:
                test = _TestStat(nodeid=report.nodeid)
                self._tests[report.nodeid] = test

            end_offset_s = perf_counter() - self._session_start
            start_offset_s = max(0.0, end_offset_s - duration)
            test.phases[when] = {
                "duration_s": duration,
                "start_offset_s": start_offset_s,
                "end_offset_s": end_offset_s,
            }

        if report.when == "call":
            self._outcomes[report.outcome] += 1
            self._tests[report.nodeid].outcome = report.outcome
        elif report.failed and when in {"setup", "teardown"}:
            self._tests[report.nodeid].outcome = report.outcome

    def pytest_sessionfinish(self, session, exitstatus):
        _ = session, exitstatus
        self._write_profile()

    def pytest_unconfigure(self, config):
        _ = config
        self._write_profile()

    def _write_profile(self) -> None:
        if self._written:
            return

        run_id = RuntimeInfraConfig.get_run_id()
        run_dir = RuntimeInfraConfig.get_run_dir()
        out_dir = Path(run_dir) / "profiles"
        out_dir.mkdir(parents=True, exist_ok=True)

        run_prefix = str(self._config.getoption("--run-prefix") or "test")
        lane_profile = str(self._config.getoption("--parallel-lane-profile") or "")
        is_parallel_child = bool(self._config.getoption("--parallel-child"))
        role = "parallel-child" if is_parallel_child else "main"
        pid = os.getpid()
        out_path = out_dir / f"runtime-profile-{run_prefix}-{role}-pid{pid}.json"

        fixture_rows = []
        fixture_setup_total = 0.0
        fixture_teardown_total = 0.0
        for stat in sorted(
            self._fixtures.values(), key=lambda s: s.setup_total + s.teardown_total, reverse=True
        ):
            fixture_setup_total += stat.setup_total
            fixture_teardown_total += stat.teardown_total
            fixture_rows.append(
                {
                    "name": stat.name,
                    "scope": stat.scope,
                    "location": stat.location,
                    "setup_count": stat.setup_count,
                    "setup_total_s": stat.setup_total,
                    "setup_avg_s": (
                        (stat.setup_total / stat.setup_count) if stat.setup_count else 0.0
                    ),
                    "setup_max_s": stat.setup_max,
                    "teardown_count": stat.teardown_count,
                    "teardown_total_s": stat.teardown_total,
                    "teardown_avg_s": (
                        (stat.teardown_total / stat.teardown_count) if stat.teardown_count else 0.0
                    ),
                    "teardown_max_s": stat.teardown_max,
                }
            )

        collection_duration = 0.0
        if self._collection_start is not None and self._collection_end is not None:
            collection_duration = self._collection_end - self._collection_start

        total_duration = perf_counter() - self._session_start

        test_rows = []
        for stat in sorted(
            self._tests.values(),
            key=lambda s: min(
                (phase["start_offset_s"] for phase in s.phases.values()), default=0.0
            ),
        ):
            phase_seconds = {
                name: values["duration_s"] for name, values in sorted(stat.phases.items())
            }
            start_offset_s = min(
                (phase["start_offset_s"] for phase in stat.phases.values()), default=0.0
            )
            end_offset_s = max(
                (phase["end_offset_s"] for phase in stat.phases.values()), default=0.0
            )
            test_rows.append(
                {
                    "nodeid": stat.nodeid,
                    "outcome": stat.outcome,
                    "phase_seconds": phase_seconds,
                    "total_s": sum(phase_seconds.values()),
                    "start_offset_s": start_offset_s,
                    "end_offset_s": end_offset_s,
                    "start_utc": (self._session_start_wall.timestamp() + start_offset_s),
                    "end_utc": (self._session_start_wall.timestamp() + end_offset_s),
                }
            )

        payload: dict[str, Any] = {
            "run_prefix": run_prefix,
            "run_id": run_id,
            "run_dir": str(run_dir),
            "parallel_child": is_parallel_child,
            "parallel_lane_profile": lane_profile,
            "pid": pid,
            "tests_collected": self._tests_collected,
            "phase_seconds": {
                "collection": collection_duration,
                "report_setup": self._reports["setup"],
                "report_call": self._reports["call"],
                "report_teardown": self._reports["teardown"],
                "fixture_setup": fixture_setup_total,
                "fixture_teardown": fixture_teardown_total,
                "pytest_setup_other": self._reports["setup"] - fixture_setup_total,
                "pytest_teardown_other": self._reports["teardown"] - fixture_teardown_total,
                "session_total": total_duration,
            },
            "external_phase_seconds": dict(sorted(_EXTERNAL_PHASE_SECONDS.items())),
            "report_counts": self._report_counts,
            "outcomes": dict(self._outcomes),
            "fixtures": fixture_rows,
            "tests": test_rows,
        }

        with open(out_path, "w") as f:
            json.dump(payload, f, indent=2)
        self._written = True

    @staticmethod
    def _fixture_key(fixturedef) -> tuple[str, str, str]:
        func = getattr(fixturedef, "func", None)
        argname = str(getattr(fixturedef, "argname", "<unknown>"))
        scope = str(getattr(fixturedef, "scope", "<unknown>"))
        if func is None or not hasattr(func, "__code__"):
            return argname, scope, "<builtin>"

        code = func.__code__
        location = f"{Path(code.co_filename).as_posix()}:{code.co_firstlineno}"
        return argname, scope, location
