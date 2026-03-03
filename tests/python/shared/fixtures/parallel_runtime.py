# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import sys
import argparse
from pathlib import Path
from subprocess import STDOUT, Popen
from time import monotonic
from time import sleep
from typing import Callable

from _pytest.reports import TestReport

PROFILE_ORDER = {"core": 0, "extended": 1, "full": 2}
PARALLEL_PROFILES = tuple(PROFILE_ORDER.keys())


def add_pytest_options(group) -> None:
    group._addoption(
        "--parallel",
        action="store",
        default=None,
        help=(
            "Run tests in parallel lanes with profile list, e.g. "
            "--parallel core,extended,full or --parallel core*4"
        ),
    )
    group._addoption(
        "--parallel-profile-mismatch",
        action="store",
        default="error",
        choices=("error", "replace"),
        help=(
            "When --parallel and --infra=up are used with already running lane stacks, "
            "handle stored lane profile mismatch as: 'error' (fail fast) or "
            "'replace' (down and recreate only mismatched lanes)."
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
    group._addoption("--parallel-lane-profile", action="store", default="core", help=argparse.SUPPRESS)
    group._addoption("--parallel-lane-profiles", action="store", default="", help=argparse.SUPPRESS)
    group._addoption("--parallel-events-file", action="store", default="", help=argparse.SUPPRESS)


def parse_parallel_profiles(value: str | None, allowed_profiles: tuple[str, ...]) -> list[str]:
    if not value:
        return []
    profiles: list[str] = []
    for entry in (part.strip() for part in value.split(",") if part.strip()):
        if "*" not in entry:
            profiles.append(entry)
            continue

        profile, _, multiplier_raw = entry.partition("*")
        profile = profile.strip()
        multiplier_raw = multiplier_raw.strip()
        if not profile or not multiplier_raw or "*" in multiplier_raw:
            raise ValueError(
                f"Invalid parallel profile entry '{entry}'. "
                "Use '<profile>*<count>', e.g. 'core*4'."
            )
        if not multiplier_raw.isdigit() or int(multiplier_raw) <= 0:
            raise ValueError(
                f"Invalid parallel profile multiplier in '{entry}'. "
                "Count must be a positive integer."
            )
        profiles.extend([profile] * int(multiplier_raw))

    invalid = sorted(set(profiles) - set(allowed_profiles))
    if invalid:
        raise ValueError(
            f"Unknown parallel profile(s): {', '.join(invalid)}. "
            f"Allowed: {', '.join(allowed_profiles)}"
        )
    return profiles


def lane_supports(required: str, lane_profile: str) -> bool:
    return PROFILE_ORDER[lane_profile] >= PROFILE_ORDER[required]


def assigned_lane_index(required: str, lane_profiles: list[str], lane_loads: list[int]) -> int:
    eligible = [idx for idx, lane_profile in enumerate(lane_profiles) if lane_supports(required, lane_profile)]
    if not eligible:
        return -1

    # Deterministic load-aware balancing:
    # pick the least loaded eligible lane, tie-breaking by lane index.
    return min(eligible, key=lambda idx: (lane_loads[idx], idx))


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
        "--infra-profile",
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
            f"--infra-profile={profile}",
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

                # If run succeeded, verify assignment integrity:
                # every selected test started exactly once across lanes.
                if combined_rc == 0:
                    all_started = set().union(*started_nodeids_by_lane.values())
                    total_started = sum(len(v) for v in started_nodeids_by_lane.values())
                    if total_started != len(all_started):
                        write_line(
                            "[parallel] warning: duplicate test execution detected across lanes",
                            red=True,
                        )
                    if total_selected and len(all_started) != total_selected:
                        write_line(
                            "[parallel] warning: selected/started mismatch "
                            f"(selected={total_selected}, started={len(all_started)})",
                            red=True,
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
    write_line(f"[parallel] total elapsed: {elapsed:.1f}s")
    return combined_rc


def run_parallel_infra_mode(
    *,
    session,
    profiles: list[str],
    run_prefix: str,
    infra_mode: str,
    profile_mismatch_policy: str,
    pick_free_port: Callable[[int, set[int]], int],
    runtime_dir_for_project: Callable[[str], Path],
) -> None:
    base_args = list(session.config.invocation_params.args)
    base_args = without_option(
        base_args,
        "--parallel",
        "--run-prefix",
        "--infra-profile",
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

    if mismatch_lanes and profile_mismatch_policy == "error":
        details = "; ".join(
            f"lane {lane_idx} ({project_name}): saved={saved} requested={requested}"
            for lane_idx, project_name, saved, requested in mismatch_lanes
        )
        raise RuntimeError(
            "Parallel infra 'up' profile mismatch detected: "
            f"{details}. "
            "Use '--parallel-profile-mismatch=replace' to recreate only mismatched lanes."
        )

    if mismatch_lanes and profile_mismatch_policy == "replace":
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
            f"--run-prefix={project_name}",
            f"--infra-profile={profile}",
            f"--infra={infra_mode}",
            f"--test-http-port={ports['http_port']}",
            f"--test-logs-port={ports['logs_port']}",
            f"--test-minio-port={ports['minio_port']}",
            f"--test-minio-console-port={ports['minio_console_port']}",
        ]
        # Run infra actions concurrently; inherit stdout/stderr to keep normal pytest CLI behavior.
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
