# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import warnings
from typing import Optional

import tqdm
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter, TqdmProgressReporter
from cvat_sdk.core.progress import NullProgressReporter, ProgressReporter


def _exercise_reporter(r: ProgressReporter) -> None:
    with r.task(total=5, desc="Test task", unit="parrots"):
        r.advance(1)
        r.report_status(4)

        for x in r.iter(["x"]):
            assert x == "x"


def test_null_reporter():
    _exercise_reporter(NullProgressReporter())
    # NPR doesn't do anything, so there's nothing to assert


def test_tqdm_reporter():
    f = io.StringIO()

    instance = tqdm.tqdm(file=f)

    with warnings.catch_warnings():
        r = TqdmProgressReporter(instance)

    _exercise_reporter(r)

    output = f.getvalue()

    assert "100%" in output
    assert "Test task" in output
    # TPR doesn't support parameters other than "total" and "desc",
    # so there won't be any parrots in the output.


def test_deferred_tqdm_reporter():
    f = io.StringIO()

    _exercise_reporter(DeferredTqdmProgressReporter({"file": f}))

    output = f.getvalue()

    assert "100%" in output
    assert "Test task" in output
    assert "parrots" in output


class _LegacyProgressReporter(ProgressReporter):
    # overriding start instead of start2
    def start(self, total: int, *, desc: Optional[str] = None) -> None:
        self.total = total
        self.desc = desc
        self.progress = 0

    def report_status(self, progress: int):
        self.progress = progress

    def advance(self, delta: int):
        self.progress += delta

    def finish(self):
        self.finished = True


def test_legacy_progress_reporter():
    r = _LegacyProgressReporter()

    _exercise_reporter(r)

    assert r.total == 5
    assert r.desc == "Test task"
    assert r.progress == 5
