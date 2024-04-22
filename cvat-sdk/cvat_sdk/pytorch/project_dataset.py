# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from typing import Callable, Container, Mapping, Optional

import torch
import torch.utils.data
import torchvision.datasets

import cvat_sdk.core
import cvat_sdk.core.exceptions
import cvat_sdk.models as models
from cvat_sdk.datasets.caching import UpdatePolicy, make_cache_manager
from cvat_sdk.pytorch.task_dataset import TaskVisionDataset


class ProjectVisionDataset(torchvision.datasets.VisionDataset):
    """
    Represents a project on a CVAT server as a PyTorch Dataset.

    The dataset contains one sample for each frame of each task in the project
    (except for tasks that are filtered out - see the description of `task_filter`
    in the constructor). The sequence of samples is formed by concatening sequences
    of samples from all included tasks in an arbitrary order that's consistent
    between executions. Each task's sequence of samples corresponds to the sequence
    of frames on the server.

    See `TaskVisionDataset` for information on sample format, caching, and
    current limitations.
    """

    def __init__(
        self,
        client: cvat_sdk.core.Client,
        project_id: int,
        *,
        transforms: Optional[Callable] = None,
        transform: Optional[Callable] = None,
        target_transform: Optional[Callable] = None,
        label_name_to_index: Mapping[str, int] = None,
        task_filter: Optional[Callable[[models.ITaskRead], bool]] = None,
        include_subsets: Optional[Container[str]] = None,
        update_policy: UpdatePolicy = UpdatePolicy.IF_MISSING_OR_STALE,
    ) -> None:
        """
        Creates a dataset corresponding to the project with ID `project_id` on the
        server that `client` is connected to.

        `transforms`, `transform` and `target_transforms` are optional transformation
        functions; see the documentation for `torchvision.datasets.VisionDataset` for
        more information.

        See `TaskVisionDataset.__init__` for information on `label_name_to_index`.

        By default, all of the project's tasks will be included in the dataset.
        The following parameters can be specified to exclude some tasks:

        * If `task_filter` is set to a callable object, it will be applied to every task.
          Tasks for which it returns a false value will be excluded.

        * If `include_subsets` is set to a container, then tasks whose subset is
          not a member of this container will be excluded.

        `update_policy` determines when and if the local cache will be updated.
        """

        self._logger = client.logger

        cache_manager = make_cache_manager(client, update_policy)
        project = cache_manager.retrieve_project(project_id)

        super().__init__(
            os.fspath(cache_manager.project_dir(project_id)),
            transforms=transforms,
            transform=transform,
            target_transform=target_transform,
        )

        self._logger.info("Fetching project tasks...")
        tasks = project.get_tasks()

        if task_filter is not None:
            tasks = list(filter(task_filter, tasks))

        if include_subsets is not None:
            tasks = [task for task in tasks if task.subset in include_subsets]

        tasks.sort(key=lambda t: t.id)  # ensure consistent order between executions

        self._underlying = torch.utils.data.ConcatDataset(
            [
                TaskVisionDataset(
                    client,
                    task.id,
                    label_name_to_index=label_name_to_index,
                    update_policy=update_policy,
                )
                for task in tasks
            ]
        )

    def __getitem__(self, sample_index: int):
        """
        Returns the sample with index `sample_index`.

        `sample_index` must satisfy the condition `0 <= sample_index < len(self)`.
        """

        sample_image, sample_target = self._underlying[sample_index]

        if self.transforms:
            sample_image, sample_target = self.transforms(sample_image, sample_target)

        return sample_image, sample_target

    def __len__(self) -> int:
        """Returns the number of samples in the dataset."""
        return len(self._underlying)
