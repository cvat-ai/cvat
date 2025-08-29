# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import datetime
import threading
from pathlib import Path
from typing import Optional

import typer
from perfkit.baselines import (
    add_baseline,
    load_baselines,
    resolve_commit_by_alias,
    resolve_test_baseline,
    save_baselines,
)
from perfkit.cluster import run_k6_docker, start_cluster, stop_cluster, stop_k6_docker
from perfkit.comparison_report import ReportRow, build_report, get_comparison_table
from perfkit.config import K6_OUTPUT_SUMMARY_JSON
from perfkit.console_print import console, exit_with_error, print_info, print_success
from perfkit.k6_profile import K6Profile, warmup_profile
from perfkit.k6_summary import K6Summary, parse_k6_summary
from perfkit.metrics_watcher import start_metrics_watcher
from rich.table import Table

DEFAULT_RUNS = 3

app = typer.Typer(help="Performance CLI Tool for K6-based tests")
golden_app = typer.Typer(name="golden", help="Commands to manage a file with the baselines.")
app.add_typer(golden_app)


@app.command(
    "run-golden", help="Run and record golden test execution that will be used for comparison."
)
def run_golden(
    test_file: str = typer.Argument(..., help="K6 test script to run."),
    runs: int = typer.Option(DEFAULT_RUNS, help="Number of runs."),
    alias: str = typer.Option(..., help="Alias name for commit."),
    save_baseline: bool = typer.Option(
        True, help="Save result as baseline. Be default prints it into the console."
    ),
    verbose: bool = typer.Option(False, help="Show JS console output"),
):
    test_invalid = threading.Event()
    k6_metrics_total: list[K6Summary] = []

    def interrupt_test() -> None:
        nonlocal test_invalid
        stop_k6_docker()
        test_invalid.set()

    def run_k6_test(i) -> K6Summary | None:
        if test_invalid.is_set():
            return
        print_info(f"run {i + 1}/{runs}...")
        start_cluster()
        stop_metrics = start_metrics_watcher(max_alerts=20, on_threshold_exceeded=interrupt_test)
        print_info("starting warmup")
        exit_code = run_k6_docker(warmup_profile)
        if exit_code != 0:
            exit_with_error(f"warmup finished with an error. exit_code: {exit_code}")
        print_success("warmup completed")
        print_info(f"🚀 running test: {test_file}")
        exit_code = run_k6_docker(K6Profile(test_file), verbose=verbose)
        if exit_code != 0:
            exit_with_error("K6 execution finished with an error.")
        k6_summary_metrics = parse_k6_summary(K6_OUTPUT_SUMMARY_JSON)
        k6_metrics_total.append(k6_summary_metrics)
        stop_metrics()
        stop_cluster()
        return k6_summary_metrics

    stop_cluster()
    print_info("starting golden run")
    k6_output_metrics: K6Summary | None = None
    for i in range(runs):
        k6_output_metrics = run_k6_test(i)

        if test_invalid.is_set():
            exit_with_error(
                "Test was aborted due to system limits. "
                "Please close all resource consuming processes and try again. "
                "Or try less demanding load profile."
            )
        assert k6_output_metrics

    k6_summary_averaged = sum(k6_metrics_total) / runs

    if save_baseline:
        test_key = Path(test_file).stem
        add_baseline(k6_summary_averaged, test_key, alias)
        print_success(f"✅ Saved baseline for `{alias}` -> `{test_key}`")
    else:
        print_info("📊 Golden run complete. Results not saved.")
        console.print_json(data=k6_summary_averaged.as_dict())


@app.command("run-regression", help="Run regression test and compare it with the baseline.")
def run_regression(
    test_file: str = typer.Argument(..., help="K6 test file."),
    commit: Optional[str] = typer.Option(None, help="Baseline commit to compare against"),
    alias: Optional[str] = typer.Option(
        None, help="Named alias to baseline (e.g. 'latest-release')"
    ),
    reuse_cluster: bool = typer.Option(
        False, help="Reuse existing cluster. Cluster won't be shutdown after test."
    ),
    no_warmup: bool = typer.Option(False, help="Disable warmup for test execution."),
    verbose: bool = typer.Option(False, help="Show js console output"),
):

    def resolve_commit() -> str:
        commit_value: str | None = None
        if commit is not None:
            commit_value = commit
        elif alias:
            try:
                commit_value = resolve_commit_by_alias(baselines, alias)
            except RuntimeError as err:
                exit_with_error(f"Can't resolve alias '{alias}': {err}")
            else:
                print_info(f"Resolved alias '{alias}' → commit '{commit_value}'")
        else:
            exit_with_error(f"Must provide either --commit or --alias")
        assert commit_value
        return commit_value

    def dump_report_to_file(test_key: str, comp_report: list[ReportRow]):
        report_file = Path(f"regression-report-{test_key}.txt")
        with report_file.open("a+") as f:
            f.write(f"Regression Report for test: {test_key} | {datetime.datetime.now()}\n\n")
            f.write(
                "{:<40} {:>10} {:>10} {:>10} {:>6}\n".format(
                    "Metric", "Baseline", "Actual", "Delta", "Status"
                )
            )
            f.write("-" * 80 + "\n")
            for row in comparison_report:
                f.write("{:<40} {:>10} {:>10} {:>10} {:>6}\n".format(*row))
            f.write("\n")

    test_key = Path(test_file).stem
    baselines = load_baselines()
    commit_value = resolve_commit()

    # check test entry exists
    baseline_for_test = resolve_test_baseline(baselines, test_key, commit_value)
    if baseline_for_test is None:
        exit_with_error(f"No baseline for test {test_key}'")
    if not reuse_cluster:
        stop_cluster()
    start_cluster()
    stop_metrics = start_metrics_watcher()
    if not no_warmup:
        run_k6_docker(warmup_profile)
    run_k6_docker(K6Profile(test_file), verbose=verbose)
    stop_metrics()
    if not reuse_cluster:
        stop_cluster()
    comparison_report, failed = build_report(
        parse_k6_summary(K6_OUTPUT_SUMMARY_JSON), baseline_for_test
    )

    console.print(get_comparison_table(comparison_report))
    dump_report_to_file(test_key, comparison_report)
    if failed:
        exit_with_error("Performance regression detected", bold=True)
    else:
        print_success("All metrics within acceptable range", bold=True)


@app.command()
def shutdown():
    stop_cluster()
    print_success("Cluster has been stopped")


@golden_app.command("add-alias")
def add_alias(commit: str, alias: str):
    data = load_baselines()
    aliases = data.setdefault("aliases", {})
    aliases[alias] = commit
    save_baselines(data)
    print_success(f"Alias '{alias}' -> '{commit}' added")


@golden_app.command("remove-alias")
def remove_alias(alias: str):
    data = load_baselines()
    aliases = data.get("aliases", {})
    if alias not in aliases:
        exit_with_error(f"Alias '{alias}' not found")

    del aliases[alias]
    save_baselines(data)
    print_success(f"Alias '{alias}' removed")


@golden_app.command("show")
def show():
    data = load_baselines()
    if not data:
        print_info("no golden baselines in a file. Try to `run-golden`")
        return typer.Exit(0)
    aliases = data.pop("aliases", {})
    table = Table(title="Golden Profiles")

    table.add_column("Test File", style="bold")
    table.add_column("Commit", style="cyan")
    table.add_column("Alias", style="green")
    table.add_column("Reqs", justify="right")
    table.add_column("Avg(ms)", justify="right")
    table.add_column("P95(ms)", justify="right")

    for test_file, commits in data.items():
        for commit, metrics in commits.items():
            alias = next((k for k, v in aliases.items() if v == commit), "-")

            reqs = metrics["http_reqs"]["count"]
            avg = metrics["http_req_duration"]["avg"]
            p95 = metrics["http_req_duration"]["p95"]

            avg_str = f"{avg:.2f}" if isinstance(avg, (int, float)) else "-"
            p95_str = f"{p95:.2f}" if isinstance(p95, (int, float)) else "-"

            table.add_row(test_file, commit, alias, str(reqs), avg_str, p95_str)

    console.print(table)


if __name__ == "__main__":
    app()
