# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import json
import pathlib
from dataclasses import asdict, dataclass
from typing import Union

from perfkit.console_print import print_error


@dataclass(kw_only=True)
class K6MetricStats:
    avg: float | None = None
    max: float | None = None
    min: float | None = None
    med: float | None = None
    p90: float | None = None
    p95: float | None = None
    count: float | None = None
    value: float | None = None
    rate: float | None = None

    def as_dict(self) -> dict:
        stats = asdict(self)
        filtered = {k: v for k, v in stats.items() if v is not None}
        stats.clear()
        stats.update(filtered)
        return stats


@dataclass
class K6Summary:
    metrics: dict[str, K6MetricStats]

    def __add__(self, other: "K6Summary") -> "K6Summary":
        if set(self.metrics.keys()) != set(other.metrics.keys()):
            raise ValueError("Metric keys mismatch between summaries")

        new_metrics: dict[str, K6MetricStats] = {}

        for metric_name in self.metrics:
            m1 = self.metrics[metric_name]
            m2 = other.metrics[metric_name]

            combined = K6MetricStats()
            for field in K6MetricStats.__annotations__:
                v1 = getattr(m1, field)
                v2 = getattr(m2, field)

                if v1 is not None and v2 is not None:
                    setattr(combined, field, v1 + v2)
                elif v1 is not None:
                    setattr(combined, field, v1)
                elif v2 is not None:
                    setattr(combined, field, v2)
                # else leave it as None
            new_metrics[metric_name] = combined
        return K6Summary(metrics=new_metrics)

    def __radd__(self, other: Union["K6Summary", int]):
        if isinstance(other, int) and other == 0:
            return self
        return self.__add__(other)

    def __truediv__(self, divisor: float | int) -> "K6Summary":
        if divisor == 0:
            raise ZeroDivisionError()

        new_metrics: dict[str, K6MetricStats] = {}

        for metric_name, metric in self.metrics.items():
            divided = K6MetricStats()
            for field, value in metric.as_dict().items():
                setattr(divided, field, value / divisor)
            new_metrics[metric_name] = divided

        return K6Summary(metrics=new_metrics)

    def compare(self, other: "K6Summary", allowed_deltas: dict[str, dict[str, float]]) -> bool:
        consistent = True

        for metric_name, fields in allowed_deltas.items():
            self_metric = self.metrics.get(metric_name)
            other_metric = other.metrics.get(metric_name)

            if self_metric is None or other_metric is None:
                raise ValueError(f"Metric '{metric_name}' is missing in one of the summaries")

            for field_name, max_delta in fields.items():
                self_value = getattr(self_metric, field_name, None)
                other_value = getattr(other_metric, field_name, None)

                if self_value is None or other_value is None:
                    raise ValueError(f"Field '{field_name}' is missing in metric '{metric_name}'")

                if other_value == 0:
                    raise ZeroDivisionError(
                        f"Cannot compare field '{field_name}' of metric '{metric_name}' "
                        "because baseline value is zero"
                    )

                delta = abs(self_value - other_value) / other_value

                if delta > max_delta:
                    print_error(
                        f"{metric_name}.{field_name} exceeded delta: {delta:.3f} > {max_delta}"
                    )
                    consistent = False

        return consistent

    def as_dict(self) -> dict:
        output = {}
        for metric, stats in self.metrics.items():
            output[metric] = stats.as_dict()
        return output


def parse_k6_summary(path: pathlib.Path) -> K6Summary:
    if not path.exists():
        raise FileNotFoundError("K6 summary file wasn't found")
    json_str = path.read_text()
    raw = json.loads(json_str)
    metrics = raw.get("metrics", {})

    def parse_stat(metric_data: dict) -> K6MetricStats:
        return K6MetricStats(
            avg=metric_data.get("avg"),
            max=metric_data.get("max"),
            min=metric_data.get("min"),
            med=metric_data.get("med"),
            count=metric_data.get("count"),
            p90=metric_data.get("p(90)"),
            p95=metric_data.get("p(95)"),
            value=metric_data.get("value"),
            rate=metric_data.get("rate"),
        )

    k6_summary = K6Summary(metrics={})
    for metric_name, metric_data in metrics.items():
        stat = parse_stat(metric_data)
        k6_summary.metrics[metric_name] = stat
    return k6_summary
