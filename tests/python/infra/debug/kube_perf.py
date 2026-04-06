# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import json
import shlex
import signal
import subprocess
import sys
import tempfile
import threading
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]
TESTS_PYTHON_ROOT = REPO_ROOT / "tests/python"
if str(TESTS_PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(TESTS_PYTHON_ROOT))

try:
    from infra.config import ProjectInfraConfig, RuntimeInfraConfig
except ModuleNotFoundError as ex:
    raise SystemExit(
        "This script must be run from the Python test environment. " "Activate `.env-cvat` first."
    ) from ex


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _iso_from_timestamp(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _run_capture(cmd: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd or REPO_ROOT, text=True, capture_output=True)


class CommandError(RuntimeError):
    pass


class JsonlWriter:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.Lock()

    def write(self, payload: dict[str, Any]) -> None:
        with self._lock:
            with open(self._path, "a") as f:
                f.write(json.dumps(payload, sort_keys=True, default=str) + "\n")


@dataclass(frozen=True)
class KubeContext:
    namespace: str
    release: str
    context: str


class BaseSampler(threading.Thread):
    def __init__(self, *, interval_s: float, writer: JsonlWriter, name: str) -> None:
        super().__init__(daemon=True, name=name)
        self._interval_s = interval_s
        self._writer = writer
        self._stop_event = threading.Event()

    def stop(self) -> None:
        self._stop_event.set()

    def run(self) -> None:
        while not self._stop_event.is_set():
            started = time.monotonic()
            try:
                for payload in self.sample():
                    self._writer.write(payload)
            except Exception as ex:  # pragma: no cover - debug tooling
                self._writer.write({"ts": _utc_now(), "sampler": self.name, "error": str(ex)})

            remaining = self._interval_s - (time.monotonic() - started)
            if remaining > 0:
                self._stop_event.wait(remaining)

    def sample(self) -> list[dict[str, Any]]:
        raise NotImplementedError


class KubectlSampler(BaseSampler):
    def __init__(self, *, kube: KubeContext, interval_s: float, writer: JsonlWriter) -> None:
        super().__init__(interval_s=interval_s, writer=writer, name="kube")
        self._kube = kube

    def _kubectl(self, *args: str) -> subprocess.CompletedProcess[str]:
        return _run_capture(["kubectl", "--context", self._kube.context, *args])

    def sample(self) -> list[dict[str, Any]]:
        ts = _utc_now()
        rows: list[dict[str, Any]] = []
        commands = {
            "pods": ["--namespace", self._kube.namespace, "get", "pods", "-o", "wide"],
            "nodes": ["get", "nodes", "-o", "wide"],
            "top_nodes": ["top", "nodes"],
            "top_pods": ["--namespace", self._kube.namespace, "top", "pods", "--containers"],
        }
        for name, args in commands.items():
            result = self._kubectl(*args)
            rows.append(
                {
                    "ts": ts,
                    "sampler": self.name,
                    "kind": name,
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
            )
        return rows


class QueueSampler(BaseSampler):
    def __init__(
        self,
        *,
        kube: KubeContext,
        queue_names: tuple[str, ...],
        interval_s: float,
        writer: JsonlWriter,
    ) -> None:
        super().__init__(interval_s=interval_s, writer=writer, name="queues")
        self._kube = kube
        self._queue_names = queue_names

    def _kubectl(self, *args: str) -> subprocess.CompletedProcess[str]:
        return _run_capture(["kubectl", "--context", self._kube.context, *args])

    def _server_pod_name(self) -> str:
        selector = f"app.kubernetes.io/instance={self._kube.release},component=server"
        result = self._kubectl(
            "--namespace",
            self._kube.namespace,
            "get",
            "pods",
            "-l",
            selector,
            "-o",
            "jsonpath={.items[*].metadata.name}",
        )
        if result.returncode != 0:
            raise CommandError(result.stderr.strip() or "failed to get server pod")

        names = result.stdout.split()
        if not names:
            raise CommandError(f"no server pod found for selector {selector}")

        for name in names:
            if "-server-" in name:
                return name
        return names[0]

    def sample(self) -> list[dict[str, Any]]:
        ts = _utc_now()
        pod = self._server_pod_name()
        py = (
            "import json, django_rq; "
            "from rq import Worker; "
            "from rq.registry import DeferredJobRegistry, FailedJobRegistry, "
            "ScheduledJobRegistry, StartedJobRegistry; "
            f"names={list(self._queue_names)!r}; "
            "queue_stats=lambda name: "
            "(lambda q: {"
            "'queue': name, "
            "'queued': len(q), "
            "'started': len(StartedJobRegistry(queue=q)), "
            "'failed': len(FailedJobRegistry(queue=q)), "
            "'deferred': len(DeferredJobRegistry(queue=q)), "
            "'scheduled': len(ScheduledJobRegistry(queue=q)), "
            "'workers': len(Worker.all(connection=q.connection, queue=q))"
            "})(django_rq.get_queue(name)); "
            "print(json.dumps([queue_stats(name) for name in names]))"
        )
        shell = "cd /home/django && " f"python manage.py shell -c {shlex.quote(py)}"
        result = self._kubectl(
            "--namespace",
            self._kube.namespace,
            "exec",
            pod,
            "-c",
            "cvat-backend",
            "--",
            "sh",
            "-lc",
            shell,
        )
        if result.returncode != 0:
            return [
                {
                    "ts": ts,
                    "sampler": self.name,
                    "kind": "queue_error",
                    "pod": pod,
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
            ]

        try:
            rows = json.loads(result.stdout.strip())
        except json.JSONDecodeError as ex:
            return [
                {
                    "ts": ts,
                    "sampler": self.name,
                    "kind": "queue_parse_error",
                    "pod": pod,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "error": str(ex),
                }
            ]

        return [
            {"ts": ts, "sampler": self.name, "kind": "queue_stats", "pod": pod, **row}
            for row in rows
        ]


def _load_kube_context(run_prefix: str) -> KubeContext:
    state = ProjectInfraConfig(project_name=run_prefix).load_state() or {}
    namespace = str(state.get("kube_namespace") or "default")
    release = str(state.get("kube_release") or "").strip()
    context = str(state.get("kube_profile") or "").strip()
    if not release or not context:
        raise CommandError(f"Missing kube state for run-prefix {run_prefix!r}; run infra up first")
    return KubeContext(namespace=namespace, release=release, context=context)


def _build_pytest_base(args: argparse.Namespace) -> list[str]:
    command = [
        sys.executable,
        "-m",
        "pytest",
        "--platform=kube",
        f"--infra-profile={args.infra_profile}",
        f"--run-prefix={args.run_prefix}",
    ]
    if args.kube_cpus:
        command.append(f"--kube-cpus={args.kube_cpus}")
    if args.kube_memory:
        command.append(f"--kube-memory={args.kube_memory}")
    return command


def _tee_process(
    cmd: list[str], *, cwd: Path, log_path: Path, env: dict[str, str] | None = None
) -> int:
    with open(log_path, "w") as log_file:
        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        assert process.stdout is not None
        try:
            for line in process.stdout:
                sys.stdout.write(line)
                log_file.write(line)
        except KeyboardInterrupt:
            process.send_signal(signal.SIGINT)
            raise
        return process.wait()


def _parse_junit(junit_path: Path) -> list[dict[str, Any]]:
    root = ET.parse(junit_path).getroot()
    rows: list[dict[str, Any]] = []
    for case in root.iter("testcase"):
        classname = case.attrib.get("classname", "")
        name = case.attrib.get("name", "")
        time_s = float(case.attrib.get("time", "0") or 0.0)
        status = "passed"
        if case.find("failure") is not None:
            status = "failed"
        elif case.find("error") is not None:
            status = "error"
        elif case.find("skipped") is not None:
            status = "skipped"

        rows.append(
            {
                "nodeid": f"{classname}::{name}" if classname else name,
                "time_s": time_s,
                "status": status,
            }
        )
    rows.sort(key=lambda row: row["time_s"], reverse=True)
    return rows


def _load_runtime_test_stats(run_prefix: str) -> list[dict[str, Any]]:
    runs_root_dir = RuntimeInfraConfig.get_runs_root_dir()
    candidates = sorted(
        runs_root_dir.glob(f"{run_prefix}-*/profiles/runtime-profile-{run_prefix}-main-pid*.json")
    )
    if not candidates:
        return []

    for candidate in reversed(candidates):
        with open(candidate) as f:
            payload = json.load(f)
        test_rows = payload.get("tests", [])
        if not test_rows:
            continue

        for row in test_rows:
            if "start_utc" in row:
                row["start_utc_iso"] = _iso_from_timestamp(float(row["start_utc"]))
            if "end_utc" in row:
                row["end_utc_iso"] = _iso_from_timestamp(float(row["end_utc"]))
        return test_rows

    return []


def _load_queue_samples(path: Path) -> list[dict[str, Any]]:
    rows = []
    if not path.exists():
        return rows

    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            if payload.get("kind") == "queue_stats":
                rows.append(payload)
    return rows


def _correlate_queue_pressure(
    test_rows: list[dict[str, Any]],
    queue_rows: list[dict[str, Any]],
    *,
    timeout_s: float,
    slow_threshold_s: float,
    timeout_fraction: float,
) -> list[dict[str, Any]]:
    if not test_rows or not queue_rows:
        return []

    queue_by_ts: dict[str, list[dict[str, Any]]] = {}
    for row in queue_rows:
        queue_by_ts.setdefault(str(row["ts"]), []).append(row)

    correlated = []
    threshold = timeout_s * timeout_fraction
    for test in test_rows:
        total_s = float(test.get("total_s") or test.get("time_s") or 0.0)
        outcome = str(test.get("outcome", test.get("status", "unknown")))
        if (
            outcome not in {"failed", "error"}
            and total_s < threshold
            and total_s < slow_threshold_s
        ):
            continue

        start_ts = float(test.get("start_utc") or 0.0)
        end_ts = float(test.get("end_utc") or 0.0)
        max_total_active = 0
        max_queue_active: dict[str, int] = {}
        for sample_ts, rows in queue_by_ts.items():
            sample_epoch = (
                datetime.strptime(sample_ts, "%Y-%m-%dT%H:%M:%SZ")
                .replace(tzinfo=timezone.utc)
                .timestamp()
            )
            if start_ts and end_ts and not start_ts <= sample_epoch <= end_ts:
                continue
            active_total = 0
            for row in rows:
                active = int(row["queued"]) + int(row["started"])
                active_total += active
                max_queue_active[row["queue"]] = max(max_queue_active.get(row["queue"], 0), active)
            max_total_active = max(max_total_active, active_total)

        correlated.append(
            {
                "nodeid": test["nodeid"],
                "outcome": outcome,
                "total_s": total_s,
                "start_utc_iso": test.get("start_utc_iso"),
                "end_utc_iso": test.get("end_utc_iso"),
                "max_total_active_jobs": max_total_active,
                "max_queue_active_jobs": dict(sorted(max_queue_active.items())),
            }
        )

    correlated.sort(key=lambda row: row["total_s"], reverse=True)
    return correlated


def _write_summary_markdown(
    path: Path,
    *,
    output_dir: Path,
    suite_exit: int,
    junit_rows: list[dict[str, Any]],
    timeout_s: float,
    correlated_rows: list[dict[str, Any]],
) -> None:
    near_timeout = [row for row in junit_rows if row["time_s"] >= timeout_s * 0.8]
    over_20s = [row for row in junit_rows if row["time_s"] >= 20.0]
    failed = [row for row in junit_rows if row["status"] in {"failed", "error"}]
    top_20 = junit_rows[:20]

    lines = [
        "# Kube Performance Summary",
        "",
        f"Output directory: `{output_dir}`",
        f"Suite exit code: `{suite_exit}`",
        f"Total tests with timing: `{len(junit_rows)}`",
        f"Tests >= 20s: `{len(over_20s)}`",
        f"Tests near timeout (>= {timeout_s * 0.8:.1f}s): `{len(near_timeout)}`",
        f"Failures/errors: `{len(failed)}`",
        "",
        "## Top 20 slowest tests",
    ]
    for row in top_20:
        lines.append(f"- `{row['time_s']:.3f}s` `{row['status']}` `{row['nodeid']}`")

    if correlated_rows:
        lines.extend(["", "## Queue Pressure For Slow Tests"])
        for row in correlated_rows[:20]:
            lines.append(
                f"- `{row['total_s']:.3f}s` `{row['outcome']}` `{row['nodeid']}` "
                f"`max_active={row['max_total_active_jobs']}`"
            )

    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run local kube performance investigation")
    parser.add_argument("--run-prefix", default="kube-perf")
    parser.add_argument("--infra-profile", default="full")
    parser.add_argument("--kube-cpus", default="")
    parser.add_argument("--kube-memory", default="")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--sample-interval", type=float, default=30.0)
    parser.add_argument("--queue-interval", type=float, default=15.0)
    parser.add_argument(
        "--slow-threshold",
        type=float,
        default=20.0,
        help="Include tests at or above this duration in queue-pressure correlation output",
    )
    parser.add_argument(
        "--timeout-fraction",
        type=float,
        default=0.8,
        help="Also include tests at or above timeout * fraction in queue-pressure correlation output",
    )
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--skip-up", action="store_true")
    parser.add_argument("--skip-down", action="store_true")
    parser.add_argument("target", nargs="?", default="tests/python")
    parser.add_argument("extra_pytest_args", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    extra_args = list(args.extra_pytest_args)
    if extra_args[:1] == ["--"]:
        extra_args = extra_args[1:]

    base_cmd = _build_pytest_base(args)
    up_cmd = base_cmd + ["tests/python", "--infra=up"]
    down_cmd = base_cmd + ["tests/python", "--infra=down"]
    output_dir = args.output_dir
    temp_root = Path(tempfile.gettempdir()) / "cvat_kube_perf"
    temp_root.mkdir(parents=True, exist_ok=True)
    temp_junit_path = temp_root / f"junit-{args.run_prefix}.xml"
    temp_up_log = temp_root / f"infra-up-{args.run_prefix}.log"

    def ensure_output_dir() -> Path:
        nonlocal output_dir
        if output_dir is not None:
            output_dir.mkdir(parents=True, exist_ok=True)
            return output_dir

        run_id, run_dir = RuntimeInfraConfig._load_run_context_for_project(args.run_prefix)
        if not run_id or run_dir is None:
            raise CommandError(
                f"Missing runtime context for run-prefix {args.run_prefix!r}; profiler output dir is unknown"
            )

        output_dir = Path(run_dir) / "kube-profiler"
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir

    suite_cmd = base_cmd + [
        args.target,
        "--infra=reuse",
        f"--timeout={args.timeout}",
        f"--junitxml={temp_junit_path}",
        "--durations=0",
        "--durations-min=0",
        *extra_args,
    ]

    def write_meta() -> None:
        resolved_output_dir = ensure_output_dir()
        with open(resolved_output_dir / "meta.json", "w") as f:
            json.dump(
                {
                    "run_prefix": args.run_prefix,
                    "infra_profile": args.infra_profile,
                    "kube_cpus": args.kube_cpus,
                    "kube_memory": args.kube_memory,
                    "timeout_s": args.timeout,
                    "target": args.target,
                    "output_dir": str(resolved_output_dir),
                    "commands": {"up": up_cmd, "suite": suite_cmd, "down": down_cmd},
                    "started_at": _utc_now(),
                },
                f,
                indent=2,
            )

    samplers: list[BaseSampler] = []
    suite_exit = 0
    try:
        if not args.skip_up:
            rc = _tee_process(up_cmd, cwd=REPO_ROOT, log_path=temp_up_log)
            if rc != 0:
                resolved_output_dir = ensure_output_dir()
                write_meta()
                if temp_up_log.exists():
                    temp_up_log.replace(resolved_output_dir / "infra-up.log")

                summary_payload = {
                    "suite_exit": rc,
                    "tests_timed": 0,
                    "tests_over_20s": 0,
                    "tests_near_timeout": 0,
                    "failed_tests": [],
                    "infra_up_failed": True,
                    "infra_up_exit": rc,
                }
                with open(resolved_output_dir / "summary.json", "w") as f:
                    json.dump(summary_payload, f, indent=2)
                with open(resolved_output_dir / "summary.md", "w") as f:
                    f.write("# Kube profiler summary\n\n")
                    f.write(f"- infra up failed with exit code `{rc}`\n")
                    f.write(f"- output dir: `{resolved_output_dir}`\n")
                    f.write("- tests did not start\n")

                raise CommandError(f"infra up failed with exit code {rc}")

        resolved_output_dir = ensure_output_dir()
        write_meta()
        if temp_up_log.exists():
            temp_up_log.replace(resolved_output_dir / "infra-up.log")

        kube = _load_kube_context(args.run_prefix)
        with open(resolved_output_dir / "kube-context.json", "w") as f:
            json.dump(kube.__dict__, f, indent=2)

        queue_names = RuntimeInfraConfig.get_background_queue_names(args.infra_profile)
        samplers = [
            KubectlSampler(
                kube=kube,
                interval_s=args.sample_interval,
                writer=JsonlWriter(resolved_output_dir / "kube-snapshots.jsonl"),
            ),
            QueueSampler(
                kube=kube,
                queue_names=queue_names,
                interval_s=args.queue_interval,
                writer=JsonlWriter(resolved_output_dir / "rq-queues.jsonl"),
            ),
        ]
        for sampler in samplers:
            sampler.start()

        suite_exit = _tee_process(
            suite_cmd, cwd=REPO_ROOT, log_path=resolved_output_dir / "suite.log"
        )
        if temp_junit_path.exists():
            temp_junit_path.replace(resolved_output_dir / "junit.xml")
    finally:
        for sampler in samplers:
            sampler.stop()
        for sampler in samplers:
            sampler.join(timeout=5)
        if not args.skip_down:
            try:
                down_log_path = ensure_output_dir() / "infra-down.log"
            except CommandError:
                down_log_path = temp_root / f"infra-down-{args.run_prefix}.log"
            _tee_process(down_cmd, cwd=REPO_ROOT, log_path=down_log_path)

    resolved_output_dir = ensure_output_dir()
    junit_path = resolved_output_dir / "junit.xml"
    junit_rows = _parse_junit(junit_path) if junit_path.exists() else []
    runtime_rows = _load_runtime_test_stats(args.run_prefix)
    resolved_output_dir = ensure_output_dir()
    queue_rows = _load_queue_samples(resolved_output_dir / "rq-queues.jsonl")
    correlated_rows = _correlate_queue_pressure(
        runtime_rows,
        queue_rows,
        timeout_s=args.timeout,
        slow_threshold_s=args.slow_threshold,
        timeout_fraction=args.timeout_fraction,
    )

    with open(resolved_output_dir / "test-timings.json", "w") as f:
        json.dump(junit_rows, f, indent=2)
    with open(resolved_output_dir / "runtime-tests.json", "w") as f:
        json.dump(runtime_rows, f, indent=2)
    with open(resolved_output_dir / "slow-tests-with-queue-pressure.json", "w") as f:
        json.dump(correlated_rows, f, indent=2)
    with open(resolved_output_dir / "summary.json", "w") as f:
        json.dump(
            {
                "suite_exit": suite_exit,
                "tests_timed": len(junit_rows),
                "tests_over_20s": len([row for row in junit_rows if row["time_s"] >= 20.0]),
                "tests_near_timeout": len(
                    [row for row in junit_rows if row["time_s"] >= args.timeout * 0.8]
                ),
                "failed_tests": [row for row in junit_rows if row["status"] in {"failed", "error"}],
            },
            f,
            indent=2,
        )

    summary_md = resolved_output_dir / "summary.md"
    _write_summary_markdown(
        summary_md,
        output_dir=resolved_output_dir,
        suite_exit=suite_exit,
        junit_rows=junit_rows,
        timeout_s=args.timeout,
        correlated_rows=correlated_rows,
    )

    print(f"\nInvestigation artifacts written to: {output_dir}")
    print(f"Summary: {summary_md}")
    return suite_exit


if __name__ == "__main__":
    raise SystemExit(main())
