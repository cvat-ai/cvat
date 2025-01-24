# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Callable, Generic, Iterable, Mapping, Sequence, TypeVar

import attrs
import numpy as np

_K = TypeVar("_K")


@attrs.define
class _BaggedCounter(Generic[_K]):
    # Stores items with count = k in a single "bag". Bags are stored in the ascending order
    bags: dict[
        int,
        dict[_K, None],
        # dict is used instead of a set to preserve item order. It's also more performant
    ]

    @staticmethod
    def from_dict(item_counts: Mapping[_K, int]) -> _BaggedCounter:
        return _BaggedCounter.from_counts(item_counts, item_count=item_counts.__getitem__)

    @staticmethod
    def from_counts(items: Sequence[_K], item_count: Callable[[_K], int]) -> _BaggedCounter:
        bags = {}
        for item in items:
            count = item_count(item)
            bags.setdefault(count, dict())[item] = None

        return _BaggedCounter(bags=bags)

    def __attrs_post_init__(self):
        self._sort_bags()

    def _sort_bags(self):
        self.bags = dict(sorted(self.bags.items(), key=lambda e: e[0]))

    def shuffle(self, *, rng: np.random.Generator | None):
        if not rng:
            rng = np.random.default_rng()

        for count, bag in self.bags.items():
            items = list(bag.items())
            rng.shuffle(items)
            self.bags[count] = dict(items)

    def use_item(self, item: _K, *, count: int | None = None, bag: dict | None = None):
        if count is not None:
            if bag is None:
                bag = self.bags[count]
        elif count is None and bag is None:
            count, bag = next((c, b) for c, b in self.bags.items() if item in b)
        else:
            raise AssertionError("'bag' can only be used together with 'count'")

        bag.pop(item)

        if not bag:
            self.bags.pop(count)

        next_bag = self.bags.get(count + 1)
        if next_bag is None:
            next_bag = {}
            self.bags[count + 1] = next_bag
            self._sort_bags()  # the new bag can be added in the wrong position if there were gaps

        next_bag[item] = None

    def __iter__(self) -> Iterable[tuple[int, _K, dict]]:
        for count, bag in self.bags.items():  # bags must be ordered
            for item in bag:
                yield (count, item, bag)

    def select_next_least_used(self, count: int) -> Sequence[_K]:
        pick = [None] * count
        pick_original_use_counts = [(None, None)] * count
        for i, (use_count, item, bag) in zip(range(count), self):
            pick[i] = item
            pick_original_use_counts[i] = (use_count, bag)

        for item, (use_count, bag) in zip(pick, pick_original_use_counts):
            self.use_item(item, count=use_count, bag=bag)

        return pick


class HoneypotFrameSelector(Generic[_K]):
    def __init__(
        self,
        validation_frame_counts: Mapping[_K, int],
        *,
        rng: np.random.Generator | None = None,
    ):
        if not rng:
            rng = np.random.default_rng()

        self.rng = rng

        self._counter = _BaggedCounter.from_dict(validation_frame_counts)
        self._counter.shuffle(rng=rng)

    def select_next_frames(self, count: int) -> Sequence[_K]:
        # This approach guarantees that:
        # - every GT frame is used
        # - GT frames are used uniformly (at most min count + 1)
        # - GT frames are not repeated in jobs
        # - honeypot sets are different in jobs
        # - honeypot sets are random
        # if possible (if the job and GT counts allow this).
        # Picks must be reproducible for a given rng state.
        """
        Selects 'count' least used items randomly, without repetition
        """
        return self._counter.select_next_least_used(count)
