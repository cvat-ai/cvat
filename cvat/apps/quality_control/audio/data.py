# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Interval:
    id: int
    start: float  # milliseconds
    stop: float  # milliseconds
    label: str
    source: str = ""
    score: float = 1.0
    extra: dict[str, str] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        return self.stop - self.start
