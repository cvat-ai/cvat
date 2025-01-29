# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import types
from collections.abc import Mapping
from typing import Callable, Optional

import torchvision.datasets

import cvat_sdk.core
import cvat_sdk.core.exceptions
from cvat_sdk.datasets.caching import UpdatePolicy, make_cache_manager
from cvat_sdk.datasets.task_dataset import TaskDataset
from cvat_sdk.pytorch.common import Target

_NUM_DOWNLOAD_THREADS = 4


class TaskVisionDataset(torchvision.datasets.VisionDataset):
    """
    Represents a task on a CVAT server as a PyTorch Dataset.

    This dataset contains one sample for each frame in the task, in the same
    order as the frames are in the task. Deleted frames are omitted.
    Before transforms are applied, each sample is a tuple of
    (image, target), where:

    * image is a `PIL.Image.Image` object for the corresponding frame.
    * target is a `Target` object containing annotations for the frame.

    This class caches all data and annotations for the task on the local file system
    during construction.

    Limitations:

    * Only tasks with image (not video) data are supported at the moment.
    * Track annotations are currently not accessible.
    """

    def __init__(
        self,
        client: cvat_sdk.core.Client,
        task_id: int,
        *,
        transforms: Optional[Callable] = None,
        transform: Optional[Callable] = None,
        target_transform: Optional[Callable] = None,
        label_name_to_index: Mapping[str, int] = None,
        update_policy: UpdatePolicy = UpdatePolicy.IF_MISSING_OR_STALE,
    ) -> None:
        """
        Creates a dataset corresponding to the task with ID `task_id` on the
        server that `client` is connected to.

        `transforms`, `transform` and `target_transforms` are optional transformation
        functions; see the documentation for `torchvision.datasets.VisionDataset` for
        more information.

        `label_name_to_index` affects the `label_id_to_index` member in `Target` objects
        returned by the dataset. If it is specified, then it must contain an entry for
        each label name in the task. The `label_id_to_index` mapping will be constructed
        so that each label will be mapped to the index corresponding to the label's name
        in `label_name_to_index`.

        If `label_name_to_index` is unspecified or set to `None`, then `label_id_to_index`
        will map each label ID to a distinct integer in the range [0, `num_labels`), where
        `num_labels` is the number of labels defined in the task. This mapping will be
        generally unpredictable, but consistent for a given task.

        `update_policy` determines when and if the local cache will be updated.
        """

        self._underlying = TaskDataset(client, task_id, update_policy=update_policy)

        cache_manager = make_cache_manager(client, update_policy)

        super().__init__(
            os.fspath(cache_manager.task_dir(task_id)),
            transforms=transforms,
            transform=transform,
            target_transform=target_transform,
        )

        if label_name_to_index is None:
            self._label_id_to_index = types.MappingProxyType(
                {
                    label.id: label_index
                    for label_index, label in enumerate(
                        sorted(self._underlying.labels, key=lambda l: l.id)
                    )
                }
            )
        else:
            self._label_id_to_index = types.MappingProxyType(
                {label.id: label_name_to_index[label.name] for label in self._underlying.labels}
            )

    def __getitem__(self, sample_index: int):
        """
        Returns the sample with index `sample_index`.

        `sample_index` must satisfy the condition `0 <= sample_index < len(self)`.
        """

        sample = self._underlying.samples[sample_index]

        sample_image = sample.media.load_image()
        sample_target = Target(sample.annotations, self._label_id_to_index)

        if self.transforms:
            sample_image, sample_target = self.transforms(sample_image, sample_target)
        return sample_image, sample_target

    def __len__(self) -> int:
        """Returns the number of samples in the dataset."""
        return len(self._underlying.samples)
