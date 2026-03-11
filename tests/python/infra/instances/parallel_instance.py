# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import sys
import argparse
from collections import defaultdict
from hashlib import sha1
from pathlib import Path
from subprocess import STDOUT, Popen
from time import monotonic
from time import sleep
from typing import Callable

import pytest
from _pytest.reports import TestReport

from infra.config import project_config, run_prefix_from_config
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.parsing import parse_debug_services
from infra.system_utils import pick_free_port, run_command

PROFILE_ORDER = {"core": 0, "extended": 1, "full": 2}
PARALLEL_PROFILES = tuple(PROFILE_ORDER.keys())


def add_parallel_pytest_options(group) -> None:
    group._addoption(
        "--parallel",
        action="store",
        type=int,
        default=None,
        help=(
            "Run tests in N parallel instances (local platform only for now), "
            "e.g. --parallel 4"
        ),
    )
    group._addoption(
        "--parallel-shuffle-seed",
        action="store",
        default=None,
        type=int,
        help=(
            "Optional seed for parallel test-group shuffle order. "
            "If omitted, uses stable deterministic ordering independent of run."
        ),
    )
    group._addoption("--parallel-child", action="store_true", default=False, help=argparse.SUPPRESS)
    group._addoption("--parallel-lane-index", action="store", default=0, type=int, help=argparse.SUPPRESS)
    group._addoption("--parallel-lane-profile", action="store", default="full", help=argparse.SUPPRESS)
    group._addoption("--parallel-lane-profiles", action="store", default="", help=argparse.SUPPRESS)
    group._addoption("--parallel-events-file", action="store", default="", help=argparse.SUPPRESS)


def parse_parallel_count(value: int | None) -> int:
    if value is None:
        return 0
    if value <= 0:
        raise ValueError("--parallel must be a positive integer")
    return int(value)


def parse_lane_profiles(value: str | None, allowed_profiles: tuple[str, ...]) -> list[str]:
    if not value:
        return []
    profiles = [part.strip() for part in value.split(",") if part.strip()]

    invalid = sorted(set(profiles) - set(allowed_profiles))
    if invalid:
        raise ValueError(
            f"Unknown lane profile(s): {', '.join(invalid)}. "
            f"Allowed: {', '.join(allowed_profiles)}"
        )
    return profiles


def lane_supports(required: str, lane_profile: str) -> bool:
    return PROFILE_ORDER[lane_profile] >= PROFILE_ORDER[required]


def assigned_lane_index(required: str, lane_profiles: list[str], lane_loads: list[int]) -> int:
    eligible = [idx for idx, lane_profile in enumerate(lane_profiles) if lane_supports(required, lane_profile)]
    if not eligible:
        return -1
    return min(eligible, key=lambda idx: (lane_loads[idx], idx))


class ParallelInstance(InfraInstance):
    plugin_class: type[InfraPlugin]
    @classmethod
    def can_handle_config(cls, config) -> bool:
        if config.getoption("--parallel-child"):
            return False
        try:
            parallel_count = parse_parallel_count(config.getoption("--parallel"))
        except ValueError:
            return True
        return parallel_count > 1

    @classmethod
    def can_handle(cls, session, deps) -> bool:
        config = session.config
        return cls.can_handle_config(config)

    def start(self) -> None:
        config = self.config
        infra_mode = getattr(config, "_cvat_infra_mode")

        try:
            parallel_count = parse_parallel_count(config.getoption("--parallel"))
        except ValueError as ex:
            raise pytest.UsageError(str(ex)) from ex
        if parallel_count <= 1:
            return
        if config.getoption("--platform") != "local":
            raise pytest.UsageError(
                "--platform kube with --parallel > 1 is not implemented yet"
            )

        debug_services = parse_debug_services(config.getoption("--container-debug"))
        rebuild = config.getoption("--rebuild")
        cleanup = config.getoption("--cleanup")
        dumpdb = config.getoption("--dumpdb")
        vscode = config.getoption("--vscode")
        if any((rebuild, cleanup, dumpdb, vscode, bool(debug_services))):
            raise pytest.UsageError(
                "--parallel does not support --rebuild/--cleanup/--dumpdb/--vscode/--container-debug in parent mode"
            )

        if infra_mode in {"up", "down"}:
            lanes_raw = str(config.getoption("--parallel-lane-profiles") or "")
            if lanes_raw:
                profiles = parse_lane_profiles(lanes_raw, PARALLEL_PROFILES)
                if len(profiles) != parallel_count:
                    raise pytest.UsageError(
                        f"--parallel-lane-profiles count ({len(profiles)}) must match --parallel ({parallel_count})"
                    )
            else:
                profiles = _default_lane_profiles_for_count(parallel_count)
            try:
                run_parallel_infra_mode(
                    session=self.session,
                    profiles=profiles,
                    run_prefix=run_prefix_from_config(config),
                    infra_mode=infra_mode,
                    pick_free_port=lambda start, used_ports: pick_free_port(
                        start, used_ports, logger=self.deps.logger
                    ),
                    runtime_dir_for_project=lambda name: project_config(name).runtime_dir,
                )
            except Exception as ex:
                pytest.exit(str(ex), returncode=1)
            pytest.exit(
                f"Parallel infra '{infra_mode}' finished for {len(profiles)} lane(s)",
                returncode=0,
            )

        # Parent process does not manage a separate infra stack in parallel mode.
        return


class ParallelPlugin(InfraPlugin):
    @classmethod
    def register_options(cls, group) -> None:
        add_parallel_pytest_options(group)
        # Internal-only per-lane port overrides passed by the parallel parent process.
        group._addoption("--test-http-port", action="store", default=None, type=int, help=argparse.SUPPRESS)
        group._addoption("--test-logs-port", action="store", default=None, type=int, help=argparse.SUPPRESS)
        group._addoption("--test-minio-port", action="store", default=None, type=int, help=argparse.SUPPRESS)
        group._addoption(
            "--test-minio-console-port", action="store", default=None, type=int, help=argparse.SUPPRESS
        )

    @classmethod
    def configure(cls, config) -> None:
        configure_parallel_plugin(config)

    @classmethod
    def collection_modifyitems(cls, config, items) -> None:
        modify_collection_for_parallel(config, items)

    @classmethod
    def runtestloop(cls, session):
        return parallel_runtestloop(session)

    @classmethod
    def can_handle_config(cls, config) -> bool:
        if config.getoption("--parallel-child"):
            return True
        try:
            parallel_count = parse_parallel_count(config.getoption("--parallel"))
        except ValueError:
            return True
        return parallel_count > 1

ParallelInstance.plugin_class = ParallelPlugin


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


def _default_lane_profiles_for_count(parallel_count: int) -> list[str]:
    # Without collected tests (e.g. "pytest ... --parallel N up"), keep one
    # full-capability lane and maximize lightweight core lanes.
    if parallel_count <= 0:
        return []
    if parallel_count == 1:
        return ["full"]
    return ["full"] + ["core"] * (parallel_count - 1)


def _planned_lane_profiles(items, parallel_count: int) -> list[str]:
    if parallel_count <= 0:
        return []

    required_counts = {"core": 0, "extended": 0, "full": 0}
    for item in items:
        required = _required_infra_profile(item)
        if required not in required_counts:
            raise pytest.UsageError(
                f"Unknown infra profile '{required}' in marker for test '{item.nodeid}'"
            )
        required_counts[required] += 1

    core_count = required_counts["core"]
    extended_count = required_counts["extended"]
    full_count = required_counts["full"]
    total_count = core_count + extended_count + full_count

    best: tuple[float, int, int, int] | None = None
    for full_lanes in range(0, parallel_count + 1):
        for extended_lanes in range(0, parallel_count - full_lanes + 1):
            core_lanes = parallel_count - full_lanes - extended_lanes

            if full_count > 0 and full_lanes == 0:
                continue
            if extended_count > 0 and (extended_lanes + full_lanes) == 0:
                continue

            ext_eligible = extended_lanes + full_lanes
            if ext_eligible == 0:
                ext_eligible = 1
            full_eligible = full_lanes if full_lanes > 0 else 1

            # Approximate worst lane load:
            # core tests run on all lanes, extended on extended+full lanes,
            # full on full lanes.
            estimated_makespan = (
                core_count / parallel_count
                + extended_count / ext_eligible
                + (full_count / full_eligible if full_count > 0 else 0.0)
            )

            # Keep cores preferred unless heavier lanes materially improve balancing.
            lane_unit = max(1.0, total_count / parallel_count if parallel_count else 1.0)
            profile_penalty = lane_unit * (0.12 * extended_lanes + 0.25 * full_lanes)
            score = estimated_makespan + profile_penalty

            candidate = (score, full_lanes, extended_lanes, core_lanes)
            if best is None or candidate < best:
                best = candidate

    if best is None:
        return _default_lane_profiles_for_count(parallel_count)

    _, full_lanes, extended_lanes, core_lanes = best
    return ["full"] * full_lanes + ["extended"] * extended_lanes + ["core"] * core_lanes


def _parallel_group_key(item) -> str:
    parts = item.nodeid.split("::")
    grouping_marker = item.get_closest_marker("parallel_group")
    grouping = str(grouping_marker.args[0]).lower() if grouping_marker and grouping_marker.args else "case"

    if grouping == "case":
        return item.nodeid

    if len(parts) >= 3 and "[" not in parts[1]:
        if grouping == "function":
            return "::".join([parts[0], parts[1], parts[2].split("[", 1)[0]])
        return "::".join([parts[0], parts[1]])

    if len(parts) >= 2:
        return "::".join([parts[0], parts[1].split("[", 1)[0]])

    return item.nodeid.split("[", 1)[0]


def _stable_shuffle_key(value: str, seed: int | None) -> tuple[str, str]:
    material = value if seed is None else f"{seed}:{value}"
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


def configure_parallel_plugin(config) -> None:
    events_file = str(config.getoption("--parallel-events-file") or "")
    plugin_name = "cvat_parallel_event_plugin"
    if config.pluginmanager.get_plugin(plugin_name) is None:
        config.pluginmanager.register(_ParallelEventPlugin(events_file), plugin_name)


def modify_collection_for_parallel(config, items) -> None:
    events_file = str(config.getoption("--parallel-events-file") or "")
    shuffle_seed = config.getoption("--parallel-shuffle-seed")
    is_parallel_child = bool(config.getoption("--parallel-child"))
    lane_index = int(config.getoption("--parallel-lane-index"))

    lanes_raw = str(config.getoption("--parallel-lane-profiles") or "")
    lane_profiles = parse_lane_profiles(lanes_raw, PARALLEL_PROFILES) if lanes_raw else []
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
        grouped_items: dict[tuple[str, str], list] = defaultdict(list)
        for item in items:
            group_key = _parallel_group_key(item)
            required = required_by_nodeid[item.nodeid]
            grouped_items[(group_key, required)].append(item)

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
                if lane < 0:
                    raise pytest.UsageError(
                        f"No eligible lane profile for required profile '{module_required}'"
                    )
                lane_loads[lane] += len(module_items)
                for item in module_items:
                    lane_by_nodeid[item.nodeid] = lane

    for item in items:
        required = required_by_nodeid[item.nodeid]
        item.add_marker(pytest.mark.infra_profile(required))
        item.add_marker(getattr(pytest.mark, f"infra_required_{required}"))

        if is_parallel_child and lane_by_nodeid[item.nodeid] != lane_index:
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
        },
    )


def parallel_runtestloop(session):
    from infra.config import logger

    config = session.config
    try:
        parallel_count = parse_parallel_count(config.getoption("--parallel"))
    except ValueError as ex:
        raise pytest.UsageError(str(ex)) from ex
    if parallel_count <= 1 or config.getoption("--parallel-child"):
        return None

    lanes_raw = str(config.getoption("--parallel-lane-profiles") or "")
    if lanes_raw:
        profiles = parse_lane_profiles(lanes_raw, PARALLEL_PROFILES)
        if len(profiles) != parallel_count:
            raise pytest.UsageError(
                f"--parallel-lane-profiles count ({len(profiles)}) must match --parallel ({parallel_count})"
            )
    else:
        profiles = _planned_lane_profiles(session.items, parallel_count)

    run_parallel_lanes(
        config=config,
        session=session,
        profiles=profiles,
        run_prefix=run_prefix_from_config(config),
        pick_free_port=lambda start, used_ports: pick_free_port(start, used_ports, logger=logger),
        runtime_dir_for_project=lambda project_name: project_config(project_name).runtime_dir,
        run_command=lambda cmd, capture: run_command(cmd, capture_output=capture, logger=logger),
    )
    return True


def without_option(args: list[str], *option_names: str) -> list[str]:
    option_set = set(option_names)
    result: list[str] = []
    i = 0
    while i < len(args):
        arg = args[i]
        name, has_value, _ = arg.partition("=")
        if name in option_set:
            if not has_value and i + 1 < len(args):
                i += 2
            else:
                i += 1
            continue
        result.append(arg)
        i += 1
    return result


def stream_parallel_events(
    lane_event_paths: dict[int, Path],
    positions: dict[int, int],
    collected_by_lane: dict[int, int],
    deselected_by_lane: dict[int, int],
    collection_seen_lanes: set[int],
) -> list[dict]:
    new_events: list[dict] = []
    for lane_idx, event_path in lane_event_paths.items():
        if not event_path.exists():
            continue

        with open(event_path, "r", errors="replace") as f:
            f.seek(positions[lane_idx])
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                if event.get("type") == "collected":
                    collected_by_lane[lane_idx] = int(event.get("selected", 0))
                    deselected_by_lane[lane_idx] = int(event.get("deselected", 0))
                    collection_seen_lanes.add(lane_idx)
                    continue

                event["lane_index"] = lane_idx
                new_events.append(event)

            positions[lane_idx] = f.tell()
    return new_events


def run_parallel_lanes(
    *,
    config,
    session,
    profiles: list[str],
    run_prefix: str,
    pick_free_port: Callable[[int, set[int]], int],
    runtime_dir_for_project: Callable[[str], Path],
    run_command: Callable[[list[str], bool], tuple[str, str]],
) -> int:
    terminal_reporter = config.pluginmanager.getplugin("terminalreporter")

    def write_line(line: str, **markup) -> None:
        if terminal_reporter:
            terminal_reporter.write_line(line, **markup)
        else:
            print(line)

    base_args = list(config.invocation_params.args)
    base_args = without_option(
        base_args,
        "--parallel",
        "--run-prefix",
    )
    is_collect_only = any(arg in {"--collect-only", "--co"} for arg in base_args)

    used_ports: set[int] = set()
    lane_ports: list[dict[str, int]] = []
    for _ in profiles:
        lane_ports.append(
            {
                "http_port": pick_free_port(18080, used_ports),
                "logs_port": pick_free_port(18090, used_ports),
                "minio_port": pick_free_port(19000, used_ports),
                "minio_console_port": pick_free_port(19001, used_ports),
            }
        )

    lane_processes: list[tuple[str, int, str, Popen, Path, Path, object]] = []
    lanes_csv = ",".join(profiles)
    for lane_idx, profile in enumerate(profiles, start=1):
        project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
        ports = lane_ports[lane_idx - 1]

        cmd = [
            sys.executable,
            "-m",
            "pytest",
            *base_args,
            "--parallel-child",
            f"--parallel-lane-index={lane_idx - 1}",
            f"--parallel-lane-profile={profile}",
            f"--parallel-lane-profiles={lanes_csv}",
            f"--run-prefix={project_name}",
            f"--test-http-port={ports['http_port']}",
            f"--test-logs-port={ports['logs_port']}",
            f"--test-minio-port={ports['minio_port']}",
            f"--test-minio-console-port={ports['minio_console_port']}",
        ]

        lane_runtime_dir = runtime_dir_for_project(project_name)
        lane_runtime_dir.mkdir(parents=True, exist_ok=True)
        lane_log_path = lane_runtime_dir / f"parallel-lane-{lane_idx}-{profile}.log"
        lane_events_path = lane_runtime_dir / f"parallel-lane-{lane_idx}-{profile}.events.jsonl"
        lane_events_path.unlink(missing_ok=True)
        lane_log = open(lane_log_path, "w")

        cmd.append(f"--parallel-events-file={lane_events_path}")

        write_line(
            f"[parallel] lane {lane_idx}/{len(profiles)} "
            f"profile={profile} project={project_name} log={lane_log_path}"
        )

        proc = Popen(cmd, stdout=lane_log, stderr=STDOUT)  # nosec
        lane_processes.append(
            (project_name, lane_idx, profile, proc, lane_log_path, lane_events_path, lane_log)
        )

    combined_rc = 0
    total_selected = 0
    start_ts = monotonic()
    lane_event_paths = {lane_idx: events for _, lane_idx, _, _, _, events, _ in lane_processes}
    lane_positions = {lane_idx: 0 for lane_idx in lane_event_paths}
    collected_by_lane = {lane_idx: 0 for lane_idx in lane_event_paths}
    deselected_by_lane = {lane_idx: 0 for lane_idx in lane_event_paths}
    collection_seen_lanes: set[int] = set()
    lane_rc: dict[int, int | None] = {lane_idx: None for lane_idx in lane_event_paths}
    lane_done_at: dict[int, float | None] = {lane_idx: None for lane_idx in lane_event_paths}
    outcome_counts = {"passed": 0, "failed": 0, "skipped": 0, "error": 0}
    printed_nodeids: set[str] = set()
    started_nodeids_by_lane: dict[int, set[str]] = {
        lane_idx: set() for lane_idx in lane_event_paths
    }

    def replay_events(events: list[dict]) -> None:
        for event in events:
            event_type = event.get("type")
            location = event.get("location")
            if isinstance(location, list):
                location = tuple(location)

            if event_type == "logstart":
                config.hook.pytest_runtest_logstart(nodeid=event["nodeid"], location=location)
                lane_idx = event.get("lane_index")
                if isinstance(lane_idx, int):
                    started_nodeids_by_lane[lane_idx].add(event["nodeid"])
            elif event_type == "report":
                report = TestReport._from_json(event["report"])
                if report.outcome == "skipped" and isinstance(report.longrepr, list):
                    report.longrepr = tuple(report.longrepr)
                if terminal_reporter:
                    config.hook.pytest_runtest_logreport(report=report)
                else:
                    is_terminal_test_report = (
                        report.when == "call"
                        or (report.when == "setup" and report.outcome in {"failed", "skipped"})
                    )
                    if is_terminal_test_report and report.nodeid not in printed_nodeids:
                        printed_nodeids.add(report.nodeid)
                        executed_count = len(printed_nodeids)
                        total_selected = sum(collected_by_lane.values())
                        progress = (
                            f" [{int(executed_count * 100 / total_selected):3d}%]"
                            if total_selected
                            else ""
                        )
                        status = report.outcome.upper()
                        write_line(f"{report.nodeid} {status}{progress}")
                        key = report.outcome if report.outcome in outcome_counts else "error"
                        outcome_counts[key] += 1
            elif event_type == "logfinish":
                config.hook.pytest_runtest_logfinish(nodeid=event["nodeid"], location=location)

    try:
        while True:
            new_events = stream_parallel_events(
                lane_event_paths,
                lane_positions,
                collected_by_lane,
                deselected_by_lane,
                collection_seen_lanes,
            )

            total_selected = sum(collected_by_lane.values())
            if len(collection_seen_lanes) == len(lane_event_paths) and terminal_reporter:
                terminal_reporter._numcollected = total_selected
            replay_events(new_events)

            for _, lane_idx, _, proc, _, _, _ in lane_processes:
                if lane_rc[lane_idx] is None:
                    rc = proc.poll()
                    if rc is not None:
                        lane_rc[lane_idx] = 0 if rc == 5 else rc
                        lane_done_at[lane_idx] = monotonic()

            if all(rc is not None for rc in lane_rc.values()):
                break

            sleep(0.5)

        replay_events(
            stream_parallel_events(
                lane_event_paths,
                lane_positions,
                collected_by_lane,
                deselected_by_lane,
                collection_seen_lanes,
            )
        )

        if session is not None:
            failed_reports = outcome_counts["failed"] + outcome_counts["error"]
            session.testsfailed += failed_reports
            if total_selected:
                session.testscollected = total_selected

        for _, lane_idx, _, _, _, _, _ in lane_processes:
            rc = int(lane_rc[lane_idx] or 0)
            if rc != 0:
                write_line(f"[parallel] lane {lane_idx} exited with code {rc}", red=True)
            combined_rc = combined_rc or rc

        if session is not None and combined_rc != 0 and session.testsfailed == 0:
            session.testsfailed = 1

        if lane_done_at:
            done_times = [t for t in lane_done_at.values() if t is not None]
            if done_times:
                last_done = max(done_times)
                for _, lane_idx, profile, _, _, _, _ in lane_processes:
                    selected_count = collected_by_lane.get(lane_idx, 0)
                    started_count = len(started_nodeids_by_lane.get(lane_idx, set()))
                    finished_at = lane_done_at.get(lane_idx)
                    if finished_at is None:
                        idle_sec = 0.0
                    else:
                        idle_sec = max(0.0, last_done - finished_at)
                    write_line(
                        "[parallel] lane "
                        f"{lane_idx} profile={profile} "
                        f"selected={selected_count} started={started_count} "
                        f"idle_before_finish={idle_sec:.1f}s"
                    )
    finally:
        for _, _, _, _, _, _, lane_log in lane_processes:
            lane_log.close()

        if not is_collect_only:
            for project_name, _, _, _, _, _, _ in lane_processes:
                try:
                    run_command(
                        [
                            sys.executable,
                            "-m",
                            "pytest",
                            *base_args,
                            f"--run-prefix={project_name}",
                            "--infra=down",
                            "-q",
                        ],
                        True,
                    )
                except BaseException as ex:
                    write_line(
                        f"[parallel] failed to stop project {project_name}: {ex}",
                        red=True,
                    )

    elapsed = monotonic() - start_ts
    _write_parallel_distribution_debug(
        runtime_dir_for_project=runtime_dir_for_project,
        run_prefix=run_prefix,
        profiles=profiles,
        collected_by_lane=collected_by_lane,
        started_nodeids_by_lane=started_nodeids_by_lane,
        lane_done_at=lane_done_at,
    )
    write_line(f"[parallel] total elapsed: {elapsed:.1f}s")
    return combined_rc


def _write_parallel_distribution_debug(
    *,
    runtime_dir_for_project,
    run_prefix: str,
    profiles: list[str],
    collected_by_lane: dict[int, int],
    started_nodeids_by_lane: dict[int, set[str]],
    lane_done_at: dict[int, float | None],
) -> None:
    if not profiles:
        return

    lane_dirs = [
        runtime_dir_for_project(f"{run_prefix}{idx}") if len(profiles) > 1 else runtime_dir_for_project(run_prefix)
        for idx in range(1, len(profiles) + 1)
    ]
    root = lane_dirs[0].parent if lane_dirs else Path(".")
    out = root / f"parallel-distribution-{run_prefix}.json"

    done_times = [t for t in lane_done_at.values() if t is not None]
    last_done = max(done_times) if done_times else None

    lanes = []
    for lane_idx, profile in enumerate(profiles, start=1):
        finished_at = lane_done_at.get(lane_idx)
        idle_sec = (
            max(0.0, float(last_done - finished_at))
            if last_done is not None and finished_at is not None
            else 0.0
        )
        lanes.append(
            {
                "lane_index": lane_idx,
                "profile": profile,
                "selected": int(collected_by_lane.get(lane_idx, 0)),
                "started": int(len(started_nodeids_by_lane.get(lane_idx, set()))),
                "idle_before_finish_sec": round(idle_sec, 3),
            }
        )

    payload = {
        "run_prefix": run_prefix,
        "lane_count": len(profiles),
        "lanes": lanes,
        "total_selected": int(sum(collected_by_lane.values())),
        "total_started": int(sum(len(v) for v in started_nodeids_by_lane.values())),
    }
    try:
        with open(out, "w") as f:
            json.dump(payload, f, indent=2, sort_keys=True)
    except OSError:
        return


def run_parallel_infra_mode(
    *,
    session,
    profiles: list[str],
    run_prefix: str,
    infra_mode: str,
    pick_free_port: Callable[[int, set[int]], int],
    runtime_dir_for_project: Callable[[str], Path],
) -> None:
    base_args = list(session.config.invocation_params.args)
    base_args = without_option(
        base_args,
        "--parallel",
        "--run-prefix",
        "--infra",
    )
    base_args = [arg for arg in base_args if arg not in {"up", "down"}]

    used_ports: set[int] = set()
    lane_ports: list[dict[str, int]] = []
    mismatch_lanes: list[tuple[int, str, str, str]] = []
    for lane_idx, requested_profile in enumerate(profiles, start=1):
        project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
        state_file = runtime_dir_for_project(project_name) / "state.json"

        saved_ports: dict[str, int] | None = None
        saved_profile: str | None = None
        if state_file.exists():
            try:
                with open(state_file) as f:
                    state = json.load(f)
                if state.get("infra_profile"):
                    saved_profile = str(state["infra_profile"])
                saved_ports = {
                    "http_port": int(state["http_port"]),
                    "logs_port": int(state["logs_port"]),
                    "minio_port": int(state["minio_port"]),
                    "minio_console_port": int(state["minio_console_port"]),
                }
            except Exception:
                saved_ports = None

        if saved_ports is None:
            saved_ports = {
                "http_port": pick_free_port(18080, used_ports),
                "logs_port": pick_free_port(18090, used_ports),
                "minio_port": pick_free_port(19000, used_ports),
                "minio_console_port": pick_free_port(19001, used_ports),
            }
        else:
            used_ports.update(saved_ports.values())

        lane_ports.append(saved_ports)
        if (
            infra_mode == "up"
            and saved_profile is not None
            and saved_profile != requested_profile
        ):
            mismatch_lanes.append((lane_idx, project_name, saved_profile, requested_profile))

    if mismatch_lanes:
        down_processes: list[tuple[int, str, Popen]] = []
        for lane_idx, project_name, _, _ in mismatch_lanes:
            down_cmd = [
                sys.executable,
                "-m",
                "pytest",
                *base_args,
                "--parallel-child",
                f"--run-prefix={project_name}",
                "--infra=down",
                "-q",
            ]
            down_processes.append((lane_idx, project_name, Popen(down_cmd)))  # nosec

        down_failed: list[tuple[int, str, int]] = []
        for lane_idx, project_name, proc in down_processes:
            rc = proc.wait()
            if rc != 0:
                down_failed.append((lane_idx, project_name, rc))

        if down_failed:
            details = ", ".join(
                f"lane {lane_idx} ({project_name}) rc={rc}"
                for lane_idx, project_name, rc in down_failed
            )
            raise RuntimeError(
                "Parallel infra mismatch reconciliation failed while stopping lanes: "
                f"{details}"
            )

    lane_processes: list[tuple[int, str, Popen]] = []
    for lane_idx, profile in enumerate(profiles, start=1):
        project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
        ports = lane_ports[lane_idx - 1]
        cmd = [
            sys.executable,
            "-m",
            "pytest",
            *base_args,
            "--parallel-child",
            f"--parallel-lane-profile={profile}",
            f"--run-prefix={project_name}",
            f"--infra={infra_mode}",
            f"--test-http-port={ports['http_port']}",
            f"--test-logs-port={ports['logs_port']}",
            f"--test-minio-port={ports['minio_port']}",
            f"--test-minio-console-port={ports['minio_console_port']}",
        ]
        lane_processes.append((lane_idx, project_name, Popen(cmd)))  # nosec

    failed: list[tuple[int, str, int]] = []
    for lane_idx, project_name, proc in lane_processes:
        rc = proc.wait()
        if rc != 0:
            failed.append((lane_idx, project_name, rc))

    if failed:
        details = ", ".join(
            f"lane {lane_idx} ({project_name}) rc={rc}" for lane_idx, project_name, rc in failed
        )
        raise RuntimeError(f"Parallel infra '{infra_mode}' failed: {details}")
