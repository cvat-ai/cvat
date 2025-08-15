# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent

BASE_URL = "http://localhost:8080/api"
PROMETHEUS_URL = "http://localhost:9190"
URL_SERVER_ABOUT = f"{BASE_URL}/server/about"
CVAT_SERVER_SERVICE = "cvat_server"
K6_PERF_SERVICE = "k6-perf"

BASELINE_FILE = ROOT_DIR / "baselines.json"

DOCKER_COMPOSE_FILE = ROOT_DIR / "docker-compose-perf.yml"
DOCKER_COMPOSE_FILE_WITH_CPUSET = ROOT_DIR / "docker-compose-perf-cpuset.yml"
K6_OUTPUT_SUMMARY_JSON = ROOT_DIR / "output" / "summary.json"

ALLOWED_DELTAS: dict[str, dict[str, float]] = {
    "http_req_duration": {
        "avg": 0.07,
        "med": 0.07,
        "p90": 0.1,
        "p95": 0.1,
    },
    "iterations": {
        "count": 0.005,
        "rate": 0.005,
    },
}
