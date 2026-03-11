# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import logging
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode

import pytest

logger = logging.getLogger(__name__)

CVAT_ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "tests")
CVAT_DB_DIR = CVAT_ROOT_DIR / "tests/python/shared/assets/cvat_db"
CLICKHOUSE_INIT_SCRIPT = "components/analytics/clickhouse/init.py"
DEFAULT_PROJECT_NAME = "test"
PROJECT_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$")
DEFAULT_INFRA_MODE = "auto"
DEFAULT_INFRA_PROFILE = "full"
BASE_DC_FILES = [
    "tests/docker-compose.file_share.yml",
    "tests/docker-compose.minio.yml",
    "tests/docker-compose.pat_settings.yml",
    "tests/docker-compose.test_servers.yml",
]
PROFILE_DC_FILES = {
    "core": ["tests/docker-compose.core.profile.yml"],
    "extended": ["tests/docker-compose.extended.profile.yml"],
    "full": [],
}
RUNTIME_ROOT_DIR = Path(tempfile.gettempdir()) / "cvat_pytest_infra"
INFRA_MODES = ("auto", "up", "down")
INFRA_PROFILES = tuple(PROFILE_DC_FILES.keys())


def base_url() -> str:
    return os.environ.get("CVAT_BASE_URL", "http://localhost:8080")


def get_server_url(endpoint: str, **kwargs) -> str:
    query = urlencode(kwargs)
    return f"{base_url()}/{endpoint}" + (f"?{query}" if query else "")


def infra_profile() -> str:
    return os.environ.get("CVAT_TEST_INFRA_PROFILE", DEFAULT_INFRA_PROFILE)


def project_name() -> str:
    return os.environ.get("CVAT_TEST_RUN_PREFIX", DEFAULT_PROJECT_NAME)


def validate_project_name(name: str) -> str:
    if not PROJECT_NAME_PATTERN.match(name):
        raise pytest.UsageError(
            "Invalid project name. Use letters, digits, '_', '-', '.' and start with a letter or digit."
        )

    return name


def run_prefix_from_config(config) -> str:
    return validate_project_name(config.getoption("--run-prefix"))


@dataclass(frozen=True)
class InfraConfig:
    project_name: str
    cvat_root_dir: Path = CVAT_ROOT_DIR
    runtime_root_dir: Path = RUNTIME_ROOT_DIR

    @property
    def runtime_dir(self) -> Path:
        return self.runtime_root_dir / self.project_name

    @property
    def state_file(self) -> Path:
        return self.runtime_dir / "state.json"

    @property
    def generated_compose_files(self) -> list[Path]:
        return [
            self.runtime_dir / "docker-compose.tests.yml",
            self.runtime_dir / "docker-compose.dev.yml",
        ]

    @property
    def dc_files(self) -> list[Path]:
        return self.generated_compose_files + [self.cvat_root_dir / f for f in BASE_DC_FILES]

    @property
    def host_http_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("http_port", 8080))

    @property
    def host_logs_port(self) -> int:
        state = self.load_state() or {}
        return int(state.get("logs_port", 8090))

    def prefixed_container_name(self, container: str) -> str:
        return f"{self.project_name}_{container}_1"

    def load_state(self) -> dict | None:
        if not self.state_file.exists():
            return None
        try:
            with open(self.state_file) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            logger.warning("Ignoring unreadable runtime state file: %s", self.state_file)
            return None

    def save_state(self, state: dict) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_state_file = self.state_file.with_suffix(".state.tmp")
        with open(tmp_state_file, "w") as f:
            json.dump(state, f, indent=2, sort_keys=True)
        os.replace(tmp_state_file, self.state_file)

    def delete_state(self) -> None:
        self.state_file.unlink(missing_ok=True)


def project_config(project_name_arg: str | None = None, *, cvat_root_dir: Path = CVAT_ROOT_DIR) -> InfraConfig:
    return InfraConfig(project_name=project_name_arg or project_name(), cvat_root_dir=cvat_root_dir)


def prefixed_container_name(container: str) -> str:
    return project_config().prefixed_container_name(container)
