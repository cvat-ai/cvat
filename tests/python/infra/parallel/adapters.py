# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
import logging
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

import pytest

from infra.config import InfraMode, RuntimeInfraConfig
from infra.system_utils import is_port_free, pick_free_port

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ParallelLane:
    lane_idx: int
    profile: str
    project_name: str
    ports: dict[str, int]
    lane_dir: Path
    lane_log_path: Path
    lane_events_path: Path
    platform_args: tuple[str, ...]
    namespace: str | None = None
    release_name: str | None = None
    test_release_name: str | None = None


class ParallelPlatformAdapter(ABC):
    def __init__(self, config):
        self.config = config

    @property
    def parallelize_infra_lifecycle(self) -> bool:
        return True

    @staticmethod
    def _lane_artifacts_dir(base_dir: Path, lane_idx: int, profile: str) -> Path:
        lane_dir = base_dir / f"lane-{lane_idx}-{profile}"
        lane_dir.mkdir(parents=True, exist_ok=True)
        return lane_dir

    @staticmethod
    def _allocate_lane_ports(used_ports: set[int]) -> dict[str, int]:
        return {
            "http_port": pick_free_port(18080, used_ports, logger=logger),
            "logs_port": pick_free_port(18090, used_ports, logger=logger),
            "db_port": pick_free_port(15432, used_ports, logger=logger),
            "redis_inmem_port": pick_free_port(16379, used_ports, logger=logger),
            "redis_ondisk_port": pick_free_port(16666, used_ports, logger=logger),
            "minio_port": pick_free_port(19000, used_ports, logger=logger),
            "minio_console_port": pick_free_port(19001, used_ports, logger=logger),
        }

    @staticmethod
    def _load_state(project_name: str) -> dict:
        return RuntimeInfraConfig.get_project_config(project_name).load_state() or {}

    def _load_saved_ports(self, project_name: str) -> dict[str, int] | None:
        state = self._load_state(project_name)
        try:
            return {
                "http_port": int(state["http_port"]),
                "logs_port": int(state["logs_port"]),
                "db_port": int(state["db_port"]),
                "redis_inmem_port": int(state["redis_inmem_port"]),
                "redis_ondisk_port": int(state["redis_ondisk_port"]),
                "minio_port": int(state["minio_port"]),
                "minio_console_port": int(state["minio_console_port"]),
            }
        except Exception:
            return None

    def _lane_project_name(self, run_prefix: str, profiles: list[str], lane_idx: int) -> str:
        return f"{run_prefix}{lane_idx}" if len(profiles) > 1 else run_prefix

    def _persist_base_state(self, lane: ParallelLane, extra: dict | None = None) -> None:
        project_cfg = RuntimeInfraConfig.get_project_config(lane.project_name)
        state = project_cfg.load_state() or {}
        state.update(
            {
                "project_name": lane.project_name,
                "infra_profile": lane.profile,
                **lane.ports,
            }
        )
        if extra:
            state.update(extra)
        state["debug"] = {
            "services": [],
            "wait": False,
            "port_base": 0,
            "ports": {},
        }
        project_cfg.save_state(state)

    def _build_common_pytest_args(self, base_args: list[str]) -> list[str]:
        return list(base_args)

    @abstractmethod
    def build_lanes(
        self,
        *,
        run_prefix: str,
        profiles: list[str],
        run_artifacts_dir: Path,
        infra_mode: InfraMode,
    ) -> tuple[list[ParallelLane], list[tuple[int, str, str, str]]]:
        raise NotImplementedError

    @abstractmethod
    def persist_lane_state(self, lane: ParallelLane) -> None:
        raise NotImplementedError

    @abstractmethod
    def build_infra_command(
        self, *, base_args: list[str], lane: ParallelLane, infra_mode: InfraMode
    ) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def build_batch_command(
        self,
        *,
        base_args: list[str],
        tests_root_arg: str,
        lane: ParallelLane,
        batch_file: Path,
        lane_infra_mode: InfraMode,
    ) -> list[str]:
        raise NotImplementedError


class LocalParallelAdapter(ParallelPlatformAdapter):
    def build_lanes(
        self,
        *,
        run_prefix: str,
        profiles: list[str],
        run_artifacts_dir: Path,
        infra_mode: InfraMode,
    ) -> tuple[list[ParallelLane], list[tuple[int, str, str, str]]]:
        used_ports: set[int] = set()
        mismatch_lanes: list[tuple[int, str, str, str]] = []
        lanes: list[ParallelLane] = []
        lane_artifacts_dir = run_artifacts_dir / "lanes"
        lane_artifacts_dir.mkdir(parents=True, exist_ok=True)

        for lane_idx, requested_profile in enumerate(profiles, start=1):
            project_name = self._lane_project_name(run_prefix, profiles, lane_idx)
            RuntimeInfraConfig.write_context_for_project(project_name)
            saved_profile = str(self._load_state(project_name).get("infra_profile") or "")
            saved_ports = self._load_saved_ports(project_name)
            ports = saved_ports or self._allocate_lane_ports(used_ports)
            used_ports.update(ports.values())
            if infra_mode == InfraMode.UP and saved_profile and saved_profile != requested_profile:
                mismatch_lanes.append((lane_idx, project_name, saved_profile, requested_profile))

            lane_dir = self._lane_artifacts_dir(lane_artifacts_dir, lane_idx, requested_profile)
            lanes.append(
                ParallelLane(
                    lane_idx=lane_idx,
                    profile=requested_profile,
                    project_name=project_name,
                    ports=ports,
                    lane_dir=lane_dir,
                    lane_log_path=lane_dir / "runner.log",
                    lane_events_path=lane_dir / "events.jsonl",
                    platform_args=("--platform=local",),
                )
            )
        return lanes, mismatch_lanes

    def persist_lane_state(self, lane: ParallelLane) -> None:
        self._persist_base_state(
            lane,
            extra={
                "base_url": f"http://localhost:{lane.ports['http_port']}",
                "minio_endpoint_url": f"http://localhost:{lane.ports['minio_port']}",
            },
        )

    def build_infra_command(
        self, *, base_args: list[str], lane: ParallelLane, infra_mode: InfraMode
    ) -> list[str]:
        return [
            sys.executable,
            "-m",
            "pytest",
            *self._build_common_pytest_args(base_args),
            *lane.platform_args,
            "--parallel-child",
            f"--parallel-lane-profile={lane.profile}",
            f"--run-prefix={lane.project_name}",
            f"--infra={infra_mode}",
        ]

    def build_batch_command(
        self,
        *,
        base_args: list[str],
        tests_root_arg: str,
        lane: ParallelLane,
        batch_file: Path,
        lane_infra_mode: InfraMode,
    ) -> list[str]:
        return [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            tests_root_arg,
            *self._build_common_pytest_args(base_args),
            *lane.platform_args,
            f"--infra={lane_infra_mode}",
            "--parallel-child",
            f"--parallel-batch-file={batch_file}",
            f"--parallel-lane-profile={lane.profile}",
            f"--run-prefix={lane.project_name}",
            f"--parallel-events-file={lane.lane_events_path}",
        ]


def build_parallel_adapter(config) -> ParallelPlatformAdapter:
    platform = str(config.getoption("--platform"))
    if platform == "kube":
        raise pytest.UsageError(
            "Kube parallel is temporarily unsupported. Use '--platform=kube' without '--parallel'."
        )
    return LocalParallelAdapter(config)
