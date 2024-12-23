# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Mapping, Sequence
from typing import Generic, TypeVar

import numpy as np

_T = TypeVar("_T")


class HoneypotFrameSelector(Generic[_T]):
    def __init__(
        self, validation_frame_counts: Mapping[_T, int], *, rng: np.random.Generator | None = None
    ):
        self.validation_frame_counts = validation_frame_counts

        if not rng:
            rng = np.random.default_rng()

        self.rng = rng

    def select_next_frames(self, count: int) -> Sequence[_T]:
        # This approach guarantees that:
        # - every GT frame is used
        # - GT frames are used uniformly (at most min count + 1)
        # - GT frames are not repeated in jobs
        # - honeypot sets are different in jobs
        # - honeypot sets are random
        # if possible (if the job and GT counts allow this).
        pick = []

        for random_number in self.rng.random(count):
            least_count = min(c for f, c in self.validation_frame_counts.items() if f not in pick)
            least_used_frames = tuple(
                f
                for f, c in self.validation_frame_counts.items()
                if f not in pick
                if c == least_count
            )

            selected_item = int(random_number * len(least_used_frames))
            selected_frame = least_used_frames[selected_item]
            pick.append(selected_frame)
            self.validation_frame_counts[selected_frame] += 1

        return pick
