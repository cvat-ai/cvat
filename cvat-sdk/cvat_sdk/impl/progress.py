# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import math
from typing import Iterable, Optional, Tuple, TypeVar

import tqdm

T = TypeVar("T")


class ProgressReporter:
    """
    Only one set of methods must be called:
        - start - report_status / advance - finish
        - iter
        - split

    This class is supposed to manage the state of children progress bars
    and release of their resources, if necessary.
    """

    @property
    def period(self) -> float:
        """
        Returns reporting period.

        For example, 0.1 would mean every 10%.
        """
        raise NotImplementedError

    def start(self, total: int, *, desc: Optional[str] = None):
        """Initializes the progress bar"""
        raise NotImplementedError

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
        *,
        total: Optional[int] = None,
        desc: Optional[str] = None,
    ) -> Iterable[T]:
        """
        Traverses the iterable and reports progress simultaneously.

        Starts and finishes the progress bar automatically.

        Args:
            iterable: An iterable to be traversed
            total: The expected number of iterations. If not provided, will
              try to use iterable.__len__.
            desc: The status message

        Returns:
            An iterable over elements of the input sequence
        """

        if total is None and hasattr(iterable, "__len__"):
            total = len(iterable)

        self.start(total, desc=desc)

        if total:
            display_step = math.ceil(total * self.period)

        for i, elem in enumerate(iterable):
            if not total or i % display_step == 0:
                self.report_status(i)

            yield elem

        self.finish()

    def split(self, count: int) -> Tuple[ProgressReporter, ...]:
        """
        Splits the progress bar into few independent parts.
        In case of 0 must return an empty tuple.

        This class is supposed to manage the state of children progress bars
        and release of their resources, if necessary.
        """
        raise NotImplementedError


class NullProgressReporter(ProgressReporter):
    @property
    def period(self) -> float:
        return 0

    def start(self, total: int, *, desc: Optional[str] = None):
        pass

    def report_status(self, progress: int):
        pass

    def advance(self, delta: int):
        pass

    def iter(
        self,
        iterable: Iterable[T],
        *,
        total: Optional[int] = None,
        desc: Optional[str] = None,
    ) -> Iterable[T]:
        yield from iterable

    def split(self, count: int) -> Tuple[ProgressReporter]:
        return (self,) * count


class TqdmProgressReporter(ProgressReporter):
    def __init__(self, instance: tqdm.tqdm) -> None:
        super().__init__()
        self.tqdm = instance

    @property
    def period(self) -> float:
        return 0

    def start(self, total: int, *, desc: Optional[str] = None):
        self.tqdm.reset(total)
        self.tqdm.set_description_str(desc)

    def report_status(self, progress: int):
        self.tqdm.update(progress - self.tqdm.n)

    def advance(self, delta: int):
        self.tqdm.update(delta)


class StreamWithProgress:
    def __init__(self, stream: io.RawIOBase, pbar: ProgressReporter, length: Optional[int] = None):
        self.stream = stream
        self.pbar = pbar

        if hasattr(stream, "__len__"):
            length = len(stream)

        self.length = length
        pbar.start(length)

    def read(self, size=-1):
        chunk = self.stream.read(size)
        if chunk is not None:
            self.pbar.advance(len(chunk))
        return chunk

    def __len__(self):
        return self.length

    def seek(self, pos, start=0):
        self.stream.seek(pos, start)
        self.pbar.report_status(pos)

    def tell(self):
        return self.stream.tell()
