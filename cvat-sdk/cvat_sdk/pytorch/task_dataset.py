# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import collections
import os
import types
import zipfile
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Dict, Mapping, Optional

import PIL.Image
import torchvision.datasets

import cvat_sdk.core
import cvat_sdk.core.exceptions
import cvat_sdk.models as models
from cvat_sdk.pytorch.caching import UpdatePolicy, make_cache_manager
from cvat_sdk.pytorch.common import FrameAnnotations, Target, UnsupportedDatasetError

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

        self._logger = client.logger

        cache_manager = make_cache_manager(client, update_policy)
        self._task = cache_manager.retrieve_task(task_id)

        if not self._task.size or not self._task.data_chunk_size:
            raise UnsupportedDatasetError("The task has no data")

        if self._task.data_original_chunk_type != "imageset":
            raise UnsupportedDatasetError(
                f"{self.__class__.__name__} only supports tasks with image chunks;"
                f" current chunk type is {self._task.data_original_chunk_type!r}"
            )

        super().__init__(
            os.fspath(cache_manager.task_dir(self._task.id)),
            transforms=transforms,
            transform=transform,
            target_transform=target_transform,
        )

        data_meta = cache_manager.ensure_task_model(
            self._task.id,
            "data_meta.json",
            models.DataMetaRead,
            self._task.get_meta,
            "data metadata",
        )
        self._active_frame_indexes = sorted(
            set(range(self._task.size)) - set(data_meta.deleted_frames)
        )

        self._logger.info("Downloading chunks...")

        self._chunk_dir = cache_manager.chunk_dir(task_id)
        self._chunk_dir.mkdir(exist_ok=True, parents=True)

        needed_chunks = {
            index // self._task.data_chunk_size for index in self._active_frame_indexes
        }

        with ThreadPoolExecutor(_NUM_DOWNLOAD_THREADS) as pool:

            def ensure_chunk(chunk_index):
                cache_manager.ensure_chunk(self._task, chunk_index)

            for _ in pool.map(ensure_chunk, sorted(needed_chunks)):
                # just need to loop through all results so that any exceptions are propagated
                pass

        self._logger.info("All chunks downloaded")

        if label_name_to_index is None:
            self._label_id_to_index = types.MappingProxyType(
                {
                    label.id: label_index
                    for label_index, label in enumerate(
                        sorted(self._task.get_labels(), key=lambda l: l.id)
                    )
                }
            )
        else:
            self._label_id_to_index = types.MappingProxyType(
                {label.id: label_name_to_index[label.name] for label in self._task.get_labels()}
            )

        annotations = cache_manager.ensure_task_model(
            self._task.id,
            "annotations.json",
            models.LabeledData,
            self._task.get_annotations,
            "annotations",
        )

        self._frame_annotations: Dict[int, FrameAnnotations] = collections.defaultdict(
            FrameAnnotations
        )

        for tag in annotations.tags:
            self._frame_annotations[tag.frame].tags.append(tag)

        for shape in annotations.shapes:
            self._frame_annotations[shape.frame].shapes.append(shape)

        # TODO: tracks?

    def __getitem__(self, sample_index: int):
        """
        Returns the sample with index `sample_index`.

        `sample_index` must satisfy the condition `0 <= sample_index < len(self)`.
        """

        frame_index = self._active_frame_indexes[sample_index]
        chunk_index = frame_index // self._task.data_chunk_size
        member_index = frame_index % self._task.data_chunk_size

        with zipfile.ZipFile(self._chunk_dir / f"{chunk_index}.zip", "r") as chunk_zip:
            with chunk_zip.open(chunk_zip.infolist()[member_index]) as chunk_member:
                sample_image = PIL.Image.open(chunk_member)
                sample_image.load()

        sample_target = Target(
            annotations=self._frame_annotations[frame_index],
            label_id_to_index=self._label_id_to_index,
        )

        if self.transforms:
            sample_image, sample_target = self.transforms(sample_image, sample_target)
        return sample_image, sample_target

    def __len__(self) -> int:
        """Returns the number of samples in the dataset."""
        return len(self._active_frame_indexes)
