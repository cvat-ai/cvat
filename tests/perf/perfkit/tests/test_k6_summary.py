import pytest
from perfkit.k6_summary import K6MetricStats, K6Summary


def test_empty_summary_creation():
    summary = K6Summary(metrics={})
    assert summary is not None


def test_summary_creation_with_metrics():
    summary = K6Summary(metrics={"metric": K6MetricStats(avg=1)})
    assert summary.metrics["metric"].avg == 1


def test_summary_sum_metrics_mismatch():
    first = K6Summary(metrics={"metric1": K6MetricStats(avg=1)})
    second = K6Summary(metrics={"metric2": K6MetricStats(avg=1)})
    with pytest.raises(ValueError):
        _ = first + second


def test_sum_summary_metrics():
    first = K6Summary(metrics={"metric": K6MetricStats(avg=1)})
    second = K6Summary(metrics={"metric": K6MetricStats(avg=1)})
    sum_summary = sum([first, second])
    assert sum_summary.metrics["metric"].avg == 2


def test_truediv_summary_metrics():
    first = K6Summary(metrics={"metric": K6MetricStats(avg=6)})
    sum_summary = first / 3
    assert sum_summary.metrics["metric"].avg == 2
