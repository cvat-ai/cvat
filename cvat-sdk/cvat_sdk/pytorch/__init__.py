import base64
import collections
import json
import os
import shutil
import types
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Container, Dict, FrozenSet, List, Mapping, Optional, Type, TypeVar

import attrs
import attrs.validators
import PIL.Image
import torch
import torch.utils.data
import torchvision.datasets
from typing_extensions import TypedDict

import cvat_sdk.core
import cvat_sdk.core.exceptions
import cvat_sdk.models as models
from cvat_sdk.api_client.model_utils import to_json
from cvat_sdk.core.utils import atomic_writer

_ModelType = TypeVar("_ModelType")

_NUM_DOWNLOAD_THREADS = 4


class UnsupportedDatasetError(cvat_sdk.core.exceptions.CvatSdkException):
    pass


@attrs.frozen
class FrameAnnotations:
    """
    Contains annotations that pertain to a single frame.
    """

    tags: List[models.LabeledImage] = attrs.Factory(list)
    shapes: List[models.LabeledShape] = attrs.Factory(list)


@attrs.frozen
class Target:
    """
    Non-image data for a dataset sample.
    """

    annotations: FrameAnnotations
    """Annotations for the frame corresponding to the sample."""

    label_id_to_index: Mapping[int, int]
    """
    A mapping from label_id values in `LabeledImage` and `LabeledShape` objects
    to an integer index. This mapping is consistent across all samples for a given task.
    """


def _get_server_dir(client: cvat_sdk.core.Client) -> Path:
    # Base64-encode the name to avoid FS-unsafe characters (like slashes)
    server_dir_name = base64.urlsafe_b64encode(client.api_map.host.encode()).rstrip(b"=").decode()
    return client.config.cache_dir / f"servers/{server_dir_name}"


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
    during construction. If the task is updated on the server, the cache is updated.

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
        """

        self._logger = client.logger

        self._logger.info(f"Fetching task {task_id}...")
        self._task = client.tasks.retrieve(task_id)

        if not self._task.size or not self._task.data_chunk_size:
            raise UnsupportedDatasetError("The task has no data")

        if self._task.data_original_chunk_type != "imageset":
            raise UnsupportedDatasetError(
                f"{self.__class__.__name__} only supports tasks with image chunks;"
                f" current chunk type is {self._task.data_original_chunk_type!r}"
            )

        self._task_dir = _get_server_dir(client) / f"tasks/{self._task.id}"
        self._initialize_task_dir()

        super().__init__(
            os.fspath(self._task_dir),
            transforms=transforms,
            transform=transform,
            target_transform=target_transform,
        )

        data_meta = self._ensure_model(
            "data_meta.json", models.DataMetaRead, self._task.get_meta, "data metadata"
        )
        self._active_frame_indexes = sorted(
            set(range(self._task.size)) - set(data_meta.deleted_frames)
        )

        self._logger.info("Downloading chunks...")

        self._chunk_dir = self._task_dir / "chunks"
        self._chunk_dir.mkdir(exist_ok=True, parents=True)

        needed_chunks = {
            index // self._task.data_chunk_size for index in self._active_frame_indexes
        }

        with ThreadPoolExecutor(_NUM_DOWNLOAD_THREADS) as pool:
            for _ in pool.map(self._ensure_chunk, sorted(needed_chunks)):
                # just need to loop through all results so that any exceptions are propagated
                pass

        self._logger.info("All chunks downloaded")

        if label_name_to_index is None:
            self._label_id_to_index = types.MappingProxyType(
                {
                    label.id: label_index
                    for label_index, label in enumerate(
                        sorted(self._task.labels, key=lambda l: l.id)
                    )
                }
            )
        else:
            self._label_id_to_index = types.MappingProxyType(
                {label.id: label_name_to_index[label.name] for label in self._task.labels}
            )

        annotations = self._ensure_model(
            "annotations.json", models.LabeledData, self._task.get_annotations, "annotations"
        )

        self._frame_annotations: Dict[int, FrameAnnotations] = collections.defaultdict(
            FrameAnnotations
        )

        for tag in annotations.tags:
            self._frame_annotations[tag.frame].tags.append(tag)

        for shape in annotations.shapes:
            self._frame_annotations[shape.frame].shapes.append(shape)

        # TODO: tracks?

    def _initialize_task_dir(self) -> None:
        task_json_path = self._task_dir / "task.json"

        try:
            with open(task_json_path, "rb") as task_json_file:
                saved_task = models.TaskRead._new_from_openapi_data(**json.load(task_json_file))
        except Exception:
            self._logger.info("Task is not yet cached or the cache is corrupted")

            # If the cache was corrupted, the directory might already be there; clear it.
            if self._task_dir.exists():
                shutil.rmtree(self._task_dir)
        else:
            if saved_task.updated_date < self._task.updated_date:
                self._logger.info(
                    "Task has been updated on the server since it was cached; purging the cache"
                )
                shutil.rmtree(self._task_dir)

        self._task_dir.mkdir(exist_ok=True, parents=True)

        with atomic_writer(task_json_path, "w", encoding="UTF-8") as task_json_file:
            json.dump(to_json(self._task._model), task_json_file, indent=4)
            print(file=task_json_file)  # add final newline

    def _ensure_chunk(self, chunk_index: int) -> None:
        chunk_path = self._chunk_dir / f"{chunk_index}.zip"
        if chunk_path.exists():
            return  # already downloaded previously

        self._logger.info(f"Downloading chunk #{chunk_index}...")

        with atomic_writer(chunk_path, "wb") as chunk_file:
            self._task.download_chunk(chunk_index, chunk_file, quality="original")

    def _ensure_model(
        self,
        filename: str,
        model_type: Type[_ModelType],
        download: Callable[[], _ModelType],
        model_description: str,
    ) -> _ModelType:
        path = self._task_dir / filename

        try:
            with open(path, "rb") as f:
                model = model_type._new_from_openapi_data(**json.load(f))
            self._logger.info(f"Loaded {model_description} from cache")
            return model
        except FileNotFoundError:
            pass
        except Exception:
            self._logger.warning(f"Failed to load {model_description} from cache", exc_info=True)

        self._logger.info(f"Downloading {model_description}...")
        model = download()
        self._logger.info(f"Downloaded {model_description}")

        with atomic_writer(path, "w", encoding="UTF-8") as f:
            json.dump(to_json(model), f, indent=4)
            print(file=f)  # add final newline

        return model

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
        """

        self._logger = client.logger

        self._logger.info(f"Fetching project {project_id}...")
        project = client.projects.retrieve(project_id)

        # We don't actually need to save anything to this directory (yet),
        # but VisionDataset.__init__ requires a root, so make one.
        # It could be useful in the future to store the project data for
        # offline-only mode.
        project_dir = _get_server_dir(client) / f"projects/{project_id}"
        project_dir.mkdir(parents=True, exist_ok=True)

        super().__init__(
            os.fspath(project_dir),
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
                TaskVisionDataset(client, task.id, label_name_to_index=label_name_to_index)
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


@attrs.frozen
class ExtractSingleLabelIndex:
    """
    A target transform that takes a `Target` object and produces a single label index
    based on the tag in that object, as a 0-dimensional tensor.

    This makes the dataset samples compatible with the image classification networks
    in torchvision.

    If the annotations contain no tags, or multiple tags, raises a `ValueError`.
    """

    def __call__(self, target: Target) -> int:
        tags = target.annotations.tags
        if not tags:
            raise ValueError("sample has no tags")

        if len(tags) > 1:
            raise ValueError("sample has multiple tags")

        return torch.tensor(target.label_id_to_index[tags[0].label_id], dtype=torch.long)


class LabeledBoxes(TypedDict):
    boxes: torch.Tensor
    labels: torch.Tensor


_SUPPORTED_SHAPE_TYPES = frozenset(["rectangle", "polygon", "polyline", "points", "ellipse"])


@attrs.frozen
class ExtractBoundingBoxes:
    """
    A target transform that takes a `Target` object and returns a dictionary compatible
    with the object detection networks in torchvision.

    The dictionary contains the following entries:

    "boxes": a tensor with shape [N, 4], where each row represents a bounding box of a shape
    in the annotations in the (xmin, ymin, xmax, ymax) format.
    "labels": a tensor with shape [N] containing corresponding label indices.

    Limitations:

    * Only the following shape types are supported: rectangle, polygon, polyline,
      points, ellipse.
    * Rotated shapes are not supported.

    Unsupported shapes will cause a `UnsupportedDatasetError` exception to be
    raised unless they are filtered out by `include_shape_types`.
    """

    include_shape_types: FrozenSet[str] = attrs.field(
        converter=frozenset,
        validator=attrs.validators.deep_iterable(attrs.validators.in_(_SUPPORTED_SHAPE_TYPES)),
        kw_only=True,
    )
    """Shapes whose type is not in this set will be ignored."""

    def __call__(self, target: Target) -> LabeledBoxes:
        boxes = []
        labels = []

        for shape in target.annotations.shapes:
            if shape.type.value not in self.include_shape_types:
                continue

            if shape.rotation != 0:
                raise UnsupportedDatasetError("Rotated shapes are not supported")

            x_coords = shape.points[0::2]
            y_coords = shape.points[1::2]

            boxes.append((min(x_coords), min(y_coords), max(x_coords), max(y_coords)))
            labels.append(target.label_id_to_index[shape.label_id])

        return LabeledBoxes(
            boxes=torch.tensor(boxes, dtype=torch.float),
            labels=torch.tensor(labels, dtype=torch.long),
        )
