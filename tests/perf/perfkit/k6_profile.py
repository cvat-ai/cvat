# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
from pathlib import Path
from typing import List, Optional, Union

from perfkit.config import PROMETHEUS_URL

_DEFAULT_TREND_STATS = "count,sum,min,max,avg,med,p(90),p(95),p(99)"


class K6Profile:
    def __init__(self, test_file: Union[str, Path], enable_dashboard: bool = False) -> None:
        self.test_file = Path(test_file)
        self.env_vars: dict[str, str] = {
            "K6_PROMETHEUS_RW_SERVER_URL": f"{PROMETHEUS_URL}/api/v1/write",
            "K6_PROMETHEUS_RW_TREND_STATS": _DEFAULT_TREND_STATS,
        }
        if enable_dashboard:
            self.env_vars["K6_WEB_DASHBOARD"] = "true"
        self.args: List[str] = []

    def add_arg(self, arg: str, value: Optional[str] = None) -> None:
        self.args.append(arg)
        if value is not None:
            self.args.append(value)

    def remove_arg(self, arg: str) -> None:
        self.args.remove(arg)

    def set_env(self, key: str, value: str) -> None:
        self.env_vars[key] = value

    def remove_env(self, key: str) -> None:
        self.env_vars.pop(key, None)

    def _build_env_list(self) -> List[str]:
        result = []
        for key, val in self.env_vars.items():
            result.extend(["-e", f"{key}={val}"])
        return result

    def build_run_cmd(self, verbose=False) -> List[str]:
        args = [
            "run",
            *self._build_env_list(),
            "--out",
            "experimental-prometheus-rw",
            "--address",
            "0.0.0.0:6565",
            "--tag",
            f"testid={self.test_file.name}",
            "--summary-export=/output/summary.json",
            *self.args,
            str(self.test_file),
        ]
        if verbose:
            args.insert(1, "--verbose")
        return args

    def __repr__(self):
        return f"<K6Config file={self.test_file.name} args={self.args} env={list(self.env_vars.keys())}>"


warmup_profile = K6Profile("tests/warmup.js")
tasks_regression_profile = K6Profile("tests/regression/tasks.js")
