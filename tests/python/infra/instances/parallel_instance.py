# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import sys
import argparse
import signal
from collections import defaultdict, deque
from hashlib import sha1
from pathlib import Path
from subprocess import STDOUT, Popen
from time import monotonic
from time import sleep
from typing import Callable

import pytest
from _pytest.reports import TestReport

from infra.config import InfraMode, project_config, run_prefix_from_config
from infra.instances.base_instance import InfraInstance, InfraPlugin
from infra.parsing import parse_debug_services
from infra.system_utils import pick_free_port, run_command

PROFILE_ORDER = {"core": 0, "extended": 1, "full": 2}
_DYNAMIC_CHUNK_SIZE = 40


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
    group._addoption(
        "--parallel-batch-file", action="store", default="", help=argparse.SUPPRESS
    )
    group._addoption("--parallel-lane-profile", action="store", default="full", help=argparse.SUPPRESS)
    group._addoption("--parallel-events-file", action="store", default="", help=argparse.SUPPRESS)


def parse_parallel_count(value: int | None) -> int:
    if value is None:
        return 0
    if value <= 0:
        raise ValueError("--parallel must be a positive integer")
    return int(value)


def lane_supports(required: str, lane_profile: str) -> bool:
    return PROFILE_ORDER[lane_profile] >= PROFILE_ORDER[required]


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

        if infra_mode in {InfraMode.UP, InfraMode.DOWN}:
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
            if extended_count > 0 and extended_lanes == 0:
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


def _nodeid_cli_arg(nodeid: str) -> str:
    path, sep, rest = nodeid.partition("::")
    path_candidate = Path(path)
    if not path_candidate.exists():
        prefixed = Path("tests/python") / path
        if prefixed.exists():
            path = prefixed.as_posix()
    return path + (f"{sep}{rest}" if sep else "")


def _build_dynamic_chunks(
    items,
    *,
    shuffle_seed: int | None,
    chunk_size: int = _DYNAMIC_CHUNK_SIZE,
) -> dict[str, list[list[str]]]:
    grouped_items: dict[tuple[str, str], list[str]] = defaultdict(list)
    for item in items:
        required = _required_infra_profile(item)
        group_key = _parallel_group_key(item)
        grouped_items[(group_key, required)].append(item.nodeid)

    grouped_by_required: dict[str, list[tuple[str, str]]] = {k: [] for k in PROFILE_ORDER}
    for grouped_key in grouped_items:
        grouped_by_required[grouped_key[1]].append(grouped_key)

    result: dict[str, list[list[str]]] = {k: [] for k in PROFILE_ORDER}
    required_order = ("full", "extended", "core")
    for required in required_order:
        ordered_groups = sorted(
            grouped_by_required[required],
            key=lambda key: _stable_shuffle_key(f"{key[0]}|{key[1]}", shuffle_seed),
        )
        chunk: list[str] = []
        chunk_len = 0
        for grouped_key in ordered_groups:
            group_nodeids = grouped_items[grouped_key]
            group_len = len(group_nodeids)
            if chunk and chunk_len + group_len > chunk_size:
                result[required].append(chunk)
                chunk = []
                chunk_len = 0
            chunk.extend(group_nodeids)
            chunk_len += group_len
        if chunk:
            result[required].append(chunk)

    return result


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
    is_parallel_child = bool(config.getoption("--parallel-child"))
    batch_file = str(config.getoption("--parallel-batch-file") or "")

    selected = []
    deselected = []
    required_by_nodeid: dict[str, str] = {}

    for item in items:
        required = _required_infra_profile(item)
        if required not in PROFILE_ORDER:
            raise pytest.UsageError(
                f"Unknown infra profile '{required}' in marker for test '{item.nodeid}'"
            )
        required_by_nodeid[item.nodeid] = required

    if is_parallel_child and batch_file:
        try:
            with open(batch_file, "r") as f:
                allowed_nodeids = {line.strip() for line in f if line.strip()}
        except OSError as ex:
            raise pytest.UsageError(f"Cannot read --parallel-batch-file={batch_file!r}: {ex}") from ex

        for item in items:
            required = required_by_nodeid[item.nodeid]
            item.add_marker(pytest.mark.infra_profile(required))
            item.add_marker(getattr(pytest.mark, f"infra_required_{required}"))
            if item.nodeid in allowed_nodeids:
                selected.append(item)
            else:
                deselected.append(item)

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
        return

    if is_parallel_child:
        raise pytest.UsageError("--parallel-child test execution requires internal --parallel-batch-file")

    for item in items:
        required = required_by_nodeid[item.nodeid]
        item.add_marker(pytest.mark.infra_profile(required))
        item.add_marker(getattr(pytest.mark, f"infra_required_{required}"))
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
    base_args = [arg for arg in base_args if arg not in {"up", "down"}]
    is_collect_only = any(arg in {"--collect-only", "--co"} for arg in base_args)
    if is_collect_only:
        return 0
    shuffle_seed = config.getoption("--parallel-shuffle-seed")
    dynamic_chunk_size = max(
        1,
        min(
            _DYNAMIC_CHUNK_SIZE,
            (len(session.items) + (len(profiles) * 4) - 1) // max(1, len(profiles) * 4),
        ),
    )
    chunk_queues = {
        required: deque(chunks)
        for required, chunks in _build_dynamic_chunks(
            session.items, shuffle_seed=shuffle_seed, chunk_size=dynamic_chunk_size
        ).items()
    }
    total_selected = len(session.items)

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

    lane_processes: list[tuple[str, int, str, dict[str, int], Path, Path, object]] = []
    for lane_idx, profile in enumerate(profiles, start=1):
        project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
        ports = lane_ports[lane_idx - 1]
        lane_runtime_dir = runtime_dir_for_project(project_name)
        lane_runtime_dir.mkdir(parents=True, exist_ok=True)
        lane_log_path = lane_runtime_dir / f"parallel-lane-{lane_idx}-{profile}.log"
        lane_events_path = lane_runtime_dir / f"parallel-lane-{lane_idx}-{profile}.events.jsonl"
        lane_events_path.unlink(missing_ok=True)
        lane_log = open(lane_log_path, "w")

        write_line(
            f"[parallel] lane {lane_idx}/{len(profiles)} "
            f"profile={profile} project={project_name} log={lane_log_path}"
        )
        lane_processes.append(
            (project_name, lane_idx, profile, ports, lane_log_path, lane_events_path, lane_log)
        )

    active_procs: dict[int, Popen | None] = {
        lane_idx: None for _, lane_idx, _, _, _, _, _ in lane_processes
    }
    lane_needs_bootstrap: dict[int, bool] = {
        lane_idx: True for _, lane_idx, _, _, _, _, _ in lane_processes
    }
    lane_active_mode: dict[int, InfraMode | None] = {
        lane_idx: None for _, lane_idx, _, _, _, _, _ in lane_processes
    }
    scheduled_by_lane: dict[int, int] = {
        lane_idx: 0 for _, lane_idx, _, _, _, _, _ in lane_processes
    }
    batch_counter_by_lane: dict[int, int] = {
        lane_idx: 0 for _, lane_idx, _, _, _, _, _ in lane_processes
    }
    combined_rc = 0
    start_ts = monotonic()
    lane_event_paths = {lane_idx: events for _, lane_idx, _, _, _, events, _ in lane_processes}
    lane_positions = {lane_idx: 0 for lane_idx in lane_event_paths}
    collected_by_lane = {lane_idx: 0 for lane_idx in lane_event_paths}
    deselected_by_lane = {lane_idx: 0 for lane_idx in lane_event_paths}
    collection_seen_lanes: set[int] = set()
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

    def next_required_order(lane_profile: str) -> tuple[str, ...]:
        if lane_profile == "full":
            return ("full", "extended", "core")
        if lane_profile == "extended":
            return ("extended", "core")
        return ("core",)

    def claim_chunk(lane_profile: str) -> tuple[str | None, list[str] | None]:
        for required in next_required_order(lane_profile):
            queue = chunk_queues[required]
            if queue:
                return required, queue.popleft()
        return None, None

    try:
        run_parallel_infra_mode(
            session=session,
            profiles=profiles,
            run_prefix=run_prefix,
            infra_mode=InfraMode.UP,
            pick_free_port=pick_free_port,
            runtime_dir_for_project=runtime_dir_for_project,
            report_fn=write_line,
        )

        while True:
            new_events = stream_parallel_events(
                lane_event_paths,
                lane_positions,
                collected_by_lane,
                deselected_by_lane,
                collection_seen_lanes,
            )

            if terminal_reporter:
                terminal_reporter._numcollected = total_selected
            replay_events(new_events)

            for _, lane_idx, _, _, _, _, _ in lane_processes:
                proc = active_procs[lane_idx]
                if proc is not None:
                    rc = proc.poll()
                    if rc is not None:
                        mode = lane_active_mode[lane_idx]
                        normalized_rc = 0 if rc == 5 else rc
                        if normalized_rc != 0:
                            write_line(f"[parallel] lane {lane_idx} exited with code {normalized_rc}", red=True)
                        elif mode == InfraMode.AUTO:
                            lane_needs_bootstrap[lane_idx] = False
                        combined_rc = combined_rc or normalized_rc
                        lane_active_mode[lane_idx] = None
                        active_procs[lane_idx] = None

            has_pending_chunks = any(chunk_queues[required] for required in PROFILE_ORDER)
            for (
                project_name,
                lane_idx,
                profile,
                ports,
                _,
                lane_events_path,
                lane_log,
            ) in lane_processes:
                if active_procs[lane_idx] is not None:
                    continue
                if lane_done_at[lane_idx] is not None:
                    continue

                _, chunk = claim_chunk(profile)
                if chunk is None:
                    lane_done_at[lane_idx] = monotonic()
                    continue

                scheduled_by_lane[lane_idx] += len(chunk)
                batch_counter_by_lane[lane_idx] += 1
                batch_file = (
                    runtime_dir_for_project(project_name)
                    / f"parallel-lane-{lane_idx}-{profile}-batch-{batch_counter_by_lane[lane_idx]}.txt"
                )
                with open(batch_file, "w") as f:
                    for nodeid in chunk:
                        f.write(nodeid)
                        f.write("\n")

                nodeid_paths = sorted({_nodeid_cli_arg(nodeid).split("::", 1)[0] for nodeid in chunk})
                lane_infra_mode = (
                    InfraMode.AUTO if lane_needs_bootstrap[lane_idx] else InfraMode.REUSE
                )
                cmd = [
                    sys.executable,
                    "-m",
                    "pytest",
                    "-q",
                    "--platform=local",
                    f"--infra={lane_infra_mode}",
                    "--parallel-child",
                    f"--parallel-batch-file={batch_file}",
                    f"--parallel-lane-profile={profile}",
                    f"--run-prefix={project_name}",
                    f"--test-http-port={ports['http_port']}",
                    f"--test-logs-port={ports['logs_port']}",
                    f"--test-minio-port={ports['minio_port']}",
                    f"--test-minio-console-port={ports['minio_console_port']}",
                    f"--parallel-events-file={lane_events_path}",
                    *nodeid_paths,
                ]
                active_procs[lane_idx] = Popen(cmd, stdout=lane_log, stderr=STDOUT)  # nosec
                lane_active_mode[lane_idx] = lane_infra_mode

            all_lanes_done = all(done is not None for done in lane_done_at.values())
            no_active = all(active_procs[lane_idx] is None for lane_idx in active_procs)
            if all_lanes_done and no_active and not has_pending_chunks:
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
            session.testscollected = total_selected

        if session is not None and combined_rc != 0 and session.testsfailed == 0:
            session.testsfailed = 1

        if lane_done_at:
            done_times = [t for t in lane_done_at.values() if t is not None]
            if done_times:
                last_done = max(done_times)
                for _, lane_idx, profile, _, lane_log_path, _, _ in lane_processes:
                    selected_count = scheduled_by_lane.get(lane_idx, 0)
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
                        f"idle_before_finish={idle_sec:.1f}s "
                        f"log={lane_log_path}"
                    )
    finally:
        for _, proc in active_procs.items():
            if proc is not None and proc.poll() is None:
                try:
                    proc.terminate()
                except BaseException:
                    pass

        for _, _, _, _, _, _, lane_log in lane_processes:
            lane_log.close()

        if not is_collect_only:
            old_sigint_handler = signal.getsignal(signal.SIGINT)
            try:
                # Cleanup should be best-effort and resilient even if user presses Ctrl+C again.
                signal.signal(signal.SIGINT, signal.SIG_IGN)
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
            finally:
                signal.signal(signal.SIGINT, old_sigint_handler)

    elapsed = monotonic() - start_ts
    _write_parallel_distribution_debug(
        runtime_dir_for_project=runtime_dir_for_project,
        run_prefix=run_prefix,
        profiles=profiles,
        scheduled_by_lane=scheduled_by_lane,
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
    scheduled_by_lane: dict[int, int],
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
                "selected": int(scheduled_by_lane.get(lane_idx, 0)),
                "started": int(len(started_nodeids_by_lane.get(lane_idx, set()))),
                "idle_before_finish_sec": round(idle_sec, 3),
            }
        )

    payload = {
        "run_prefix": run_prefix,
        "lane_count": len(profiles),
        "lanes": lanes,
        "total_selected": int(sum(scheduled_by_lane.values())),
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
    infra_mode: InfraMode,
    pick_free_port: Callable[[int, set[int]], int],
    runtime_dir_for_project: Callable[[str], Path],
    report_fn: Callable[[str], None] | None = None,
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
            infra_mode == InfraMode.UP
            and saved_profile is not None
            and saved_profile != requested_profile
        ):
            mismatch_lanes.append((lane_idx, project_name, saved_profile, requested_profile))

    if mismatch_lanes:
        down_processes: list[tuple[int, str, Path, Popen, object]] = []
        emit = report_fn or print
        for lane_idx, project_name, _, _ in mismatch_lanes:
            lane_runtime_dir = runtime_dir_for_project(project_name)
            lane_runtime_dir.mkdir(parents=True, exist_ok=True)
            lane_log_path = lane_runtime_dir / f"parallel-lane-{lane_idx}-infra-reconcile-down.log"
            lane_log = open(lane_log_path, "w")
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
            emit(
                f"[parallel] infra=reconcile-down lane {lane_idx}/{len(profiles)} "
                f"project={project_name} log={lane_log_path}"
            )
            down_processes.append(
                (lane_idx, project_name, lane_log_path, Popen(down_cmd, stdout=lane_log, stderr=STDOUT), lane_log)  # nosec
            )

        down_failed: list[tuple[int, str, int, Path]] = []
        try:
            for lane_idx, project_name, lane_log_path, proc, _lane_log in down_processes:
                rc = proc.wait()
                if rc != 0:
                    down_failed.append((lane_idx, project_name, rc, lane_log_path))
        finally:
            for _, _, _, _, lane_log in down_processes:
                lane_log.close()

        if down_failed:
            details = ", ".join(
                f"lane {lane_idx} ({project_name}) rc={rc} log={lane_log_path}"
                for lane_idx, project_name, rc, lane_log_path in down_failed
            )
            raise RuntimeError(
                "Parallel infra mismatch reconciliation failed while stopping lanes: "
                f"{details}"
            )

    emit = report_fn or print

    lane_processes: list[tuple[int, str, str, Path, Popen, object]] = []
    for lane_idx, profile in enumerate(profiles, start=1):
        project_name = f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix
        ports = lane_ports[lane_idx - 1]
        lane_runtime_dir = runtime_dir_for_project(project_name)
        lane_runtime_dir.mkdir(parents=True, exist_ok=True)
        lane_log_path = lane_runtime_dir / f"parallel-lane-{lane_idx}-infra-{infra_mode}.log"
        lane_log = open(lane_log_path, "w")
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
        emit(
            f"[parallel] infra={infra_mode} lane {lane_idx}/{len(profiles)} "
            f"profile={profile} project={project_name} log={lane_log_path}"
        )
        lane_processes.append(
            (lane_idx, project_name, profile, lane_log_path, Popen(cmd, stdout=lane_log, stderr=STDOUT), lane_log)  # nosec
        )

    failed: list[tuple[int, str, int, Path]] = []
    try:
        for lane_idx, project_name, profile, lane_log_path, proc, _lane_log in lane_processes:
            lane_start = monotonic()
            rc = proc.wait()
            elapsed = monotonic() - lane_start
            if rc != 0:
                emit(
                    f"[parallel] infra={infra_mode} lane {lane_idx} profile={profile} "
                    f"project={project_name} failed rc={rc} ({elapsed:.1f}s) log={lane_log_path}"
                )
                failed.append((lane_idx, project_name, rc, lane_log_path))
            else:
                emit(
                    f"[parallel] infra={infra_mode} lane {lane_idx} profile={profile} "
                    f"project={project_name} done ({elapsed:.1f}s)"
                )
    finally:
        for _, _, _, _, _, lane_log in lane_processes:
            lane_log.close()

    if failed:
        details = ", ".join(
            f"lane {lane_idx} ({project_name}) rc={rc} log={lane_log_path}"
            for lane_idx, project_name, rc, lane_log_path in failed
        )
        raise RuntimeError(f"Parallel infra '{infra_mode}' failed: {details}")
