# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import json

from perfkit.config import BASELINE_FILE
from perfkit.console_print import console
from perfkit.k6_summary import K6Summary
from plumbum import local

git = local["git"]


def _get_last_commit_id() -> str:
    return git["rev-parse", "--short", "HEAD"]().strip()


def load_baselines() -> dict:
    if BASELINE_FILE.exists() and BASELINE_FILE.stat().st_size > 0:
        try:
            return json.loads(BASELINE_FILE.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def save_baselines(data: dict) -> None:
    BASELINE_FILE.write_text(json.dumps(data, indent=2))


def add_baseline(k6_summary_output: K6Summary, test_key: str, alias: str | None = None) -> None:
    baseline_content = load_baselines()
    if test_key not in baseline_content:
        baseline_content[test_key] = {}

    commit_id = _get_last_commit_id()

    existing = baseline_content[test_key].get(commit_id)
    if existing:
        console.print(f"[yellow] Overwriting existing baseline for test '{test_key}'[/yellow]")

    baseline_content[test_key][commit_id] = k6_summary_output.as_dict()
    if alias is not None:
        if "aliases" not in baseline_content:
            baseline_content["aliases"] = {}
        baseline_content["aliases"][alias] = commit_id
    save_baselines(baseline_content)
    console.print(f"[green] Baseline added for test '{test_key}' for commit '{commit_id}'[/green]")


def resolve_commit_by_alias(baselines: dict, alias: str) -> str:
    aliases = baselines.get("aliases")
    if aliases is None:
        raise RuntimeError("no aliases in a baseline file.")
    commit_value = aliases.get(alias)
    if commit_value is None:
        raise RuntimeError(f"no commit for alias: {alias}")
    return commit_value


def resolve_test_baseline(baselines: dict, test_key: str, commit: str) -> dict | None:
    test_baselines = baselines.get(test_key, {})
    if commit not in test_baselines:
        return None
    return test_baselines[commit]
