# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
from typing import ContextManager, Iterable, Optional, TypeVar

T = TypeVar("T")


class ProgressReporter:
    """
    Use as follows:

    with r.task(...):
        r.report_status(...)
        r.advance(...)

        for x in r.iter(...):
            ...

    Implementations must override start2, finish, report_status and advance.
    """

    @contextlib.contextmanager
    def task(self, **kwargs) -> ContextManager[None]:
        """
        Returns a context manager that represents a long-running task
        for which progress can be reported.

        Entering it creates a progress bar, and exiting it destroys it.

        kwargs will be passed to `start()`.
        """
        self.start2(**kwargs)

        try:
            yield None
        finally:
            self.finish()

    def start(self, total: int, *, desc: Optional[str] = None) -> None:
        """
        This is a compatibility method. Override start2 instead.
        """
        raise NotImplementedError

    def start2(
        self,
        total: int,
        *,
        desc: Optional[str] = None,
        unit: str = "it",
        unit_scale: bool = False,
        unit_divisor: int = 1000,
        **kwargs,
    ) -> None:
        """
        Initializes the progress bar.

        total, desc, unit, unit_scale, unit_divisor have the same meaning as in tqdm.

        kwargs is included for future extension; implementations of this method
        must ignore it.
        """
        self.start(total=total, desc=desc)

    def report_status(self, progress: int):
        """Updates the progress bar"""
        raise NotImplementedError

    def advance(self, delta: int):
        """Updates the progress bar"""
        raise NotImplementedError

    def finish(self):
        """Finishes the progress bar"""
        pass  # pylint: disable=unnecessary-pass

    def iter(
        self,
        iterable: Iterable[T],
    ) -> Iterable[T]:
        """
        Traverses the iterable and reports progress simultaneously.

        Args:
            iterable: An iterable to be traversed

        Returns:
            An iterable over elements of the input sequence
        """

        for elem in iterable:
            yield elem
            self.advance(1)


class BaseProgressReporter(ProgressReporter):
    def __init__(self) -> None:
        self._in_progress = False

    def start2(
        self,
        total: int,
        *,
        desc: Optional[str] = None,
        unit: str = "it",
        unit_scale: bool = False,
        unit_divisor: int = 1000,
        **kwargs,
    ) -> None:
        assert not self._in_progress
        self._in_progress = True

    def report_status(self, progress: int):
        assert self._in_progress

    def advance(self, delta: int):
        assert self._in_progress

    def finish(self) -> None:
        assert self._in_progress
        self._in_progress = False

    def __del__(self):
        assert not self._in_progress, "Unfinished task!"


class NullProgressReporter(BaseProgressReporter):
    pass
