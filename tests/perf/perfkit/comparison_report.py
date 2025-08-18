# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
from perfkit.config import ALLOWED_DELTAS
from perfkit.k6_summary import K6Summary
from rich.table import Table

MISSING = "MISSING"
OK = "✅"
FAIL = "❌"

ReportRow = tuple[str, str, str, str, str]


def build_report(
    k6_output_summary: K6Summary, baseline: dict[str, dict[str, float]]
) -> tuple[list[ReportRow], bool]:
    report: list[ReportRow] = []
    failed = False

    def add_report_row(
        metric_name: str,
        baseline_value: float | None = None,
        actual_value: float | None = None,
        delta: float | None = None,
        passed: bool = False,
    ) -> None:
        status = OK if passed else FAIL
        report.append(
            (
                metric_name,
                f"{baseline_value:.2f}" if baseline_value is not None else MISSING,
                f"{actual_value:.2f}" if actual_value is not None else MISSING,
                f"{delta * 100:.2f}%" if delta is not None else MISSING,
                status,
            )
        )

    for metric_name, metric in k6_output_summary.metrics.items():
        for stat_name, stat_value in metric.as_dict().items():
            metric_stat = f"{metric_name}_{stat_name}"
            try:
                baseline_value = baseline[metric_name][stat_name]
            except KeyError:
                continue
            if baseline_value == 0:
                continue

            allowed_delta: float | None = None
            if metric_name not in ALLOWED_DELTAS:
                continue
            if stat_name not in ALLOWED_DELTAS[metric_name]:
                continue
            allowed_delta = ALLOWED_DELTAS[metric_name][stat_name]

            delta = (stat_value - baseline_value) / baseline_value
            passed = abs(delta) <= allowed_delta
            if not passed:
                failed = True
            add_report_row(metric_stat, baseline_value, stat_value, delta, passed)

    return report, failed


def get_comparison_table(report: list[ReportRow]) -> Table:
    table = Table(title="Performance Comparison")
    table.add_column("Metric")
    table.add_column("Baseline")
    table.add_column("Current")
    table.add_column("Delta")
    table.add_column("Status")

    for row in report:
        table.add_row(*row)
    return table
