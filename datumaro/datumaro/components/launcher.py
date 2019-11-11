
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import numpy as np

from datumaro.components.extractor import DatasetItem, Extractor


class Launcher:
    def __init__(self):
        pass

    def launch(self, inputs):
        raise NotImplementedError()

    def preferred_input_size(self):
        return None

    def get_categories(self):
        return None

class InferenceWrapper(Extractor):
    class ItemWrapper(DatasetItem):
        def __init__(self, item, annotations, path=None):
            super().__init__(id=item.id)
            self._annotations = annotations
            self._item = item
            self._path = path

        @DatasetItem.id.getter
        def id(self):
            return self._item.id

        @DatasetItem.subset.getter
        def subset(self):
            return self._item.subset

        @DatasetItem.path.getter
        def path(self):
            return self._path

        @DatasetItem.annotations.getter
        def annotations(self):
            return self._annotations

        @DatasetItem.image.getter
        def image(self):
            return self._item.image

    def __init__(self, extractor, launcher, batch_size=1):
        super().__init__()
        self._extractor = extractor
        self._launcher = launcher
        self._batch_size = batch_size

    def __iter__(self):
        stop = False
        data_iter = iter(self._extractor)
        while not stop:
            batch_items = []
            try:
                for i in range(self._batch_size):
                    item = next(data_iter)
                    batch_items.append(item)
            except StopIteration:
                stop = True
                if len(batch_items) == 0:
                    break

            inputs = np.array([item.image for item in batch_items])
            inference = self._launcher.launch(inputs)

            for item, annotations in zip(batch_items, inference):
                yield self.ItemWrapper(item, annotations)

    def __len__(self):
        return len(self._extractor)

    def subsets(self):
        return self._extractor.subsets()

    def get_subset(self, name):
        subset = self._extractor.get_subset(name)
        return InferenceWrapper(subset,
            self._launcher, self._batch_size)

    def categories(self):
        launcher_override = self._launcher.get_categories()
        if launcher_override is not None:
            return launcher_override
        return self._extractor.categories()