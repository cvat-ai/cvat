import base64
import collections
import json
import os
import shutil
import types
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import (
    Callable,
    Dict,
    FrozenSet,
    List,
    Mapping,
    Optional,
    Sequence,
    Tuple,
    Type,
    TypeVar,
)

import appdirs
import attrs
import attrs.validators
import PIL.Image
import torchvision.datasets
from typing_extensions import TypedDict

import cvat_sdk.core
import cvat_sdk.core.exceptions
from cvat_sdk.api_client.model_utils import to_json
from cvat_sdk.core.utils import atomic_writer
from cvat_sdk.models import DataMetaRead, LabeledData, LabeledImage, LabeledShape, TaskRead

_ModelType = TypeVar("_ModelType")

_CACHE_DIR = Path(appdirs.user_cache_dir("cvat-sdk", "CVAT.ai"))
_NUM_DOWNLOAD_THREADS = 4


class UnsupportedDatasetError(cvat_sdk.core.exceptions.CvatSdkException):
    pass


@attrs.frozen
class FrameAnnotations:
    tags: List[LabeledImage] = attrs.Factory(list)
    shapes: List[LabeledShape] = attrs.Factory(list)


@attrs.frozen
class Target:
    annotations: FrameAnnotations
    label_id_to_index: Mapping[int, int]


class TaskVisionDataset(torchvision.datasets.VisionDataset):
    def __init__(
        self,
        client: cvat_sdk.core.Client,
        task_id: int,
        *,
        transforms: Optional[Callable] = None,
        transform: Optional[Callable] = None,
        target_transform: Optional[Callable] = None,
    ) -> None:
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

        # Base64-encode the name to avoid FS-unsafe characters (like slashes)
        server_dir_name = (
            base64.urlsafe_b64encode(client.api_map.host.encode()).rstrip(b"=").decode()
        )
        server_dir = _CACHE_DIR / f"servers/{server_dir_name}"

        self._task_dir = server_dir / f"tasks/{self._task.id}"
        self._initialize_task_dir()

        super().__init__(
            os.fspath(self._task_dir),
            transforms=transforms,
            transform=transform,
            target_transform=target_transform,
        )

        data_meta = self._ensure_model(
            "data_meta.json", DataMetaRead, self._task.get_meta, "data metadata"
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

        self._label_id_to_index = types.MappingProxyType(
            {
                label["id"]: label_index
                for label_index, label in enumerate(sorted(self._task.labels, key=lambda l: l.id))
            }
        )

        annotations = self._ensure_model(
            "annotations.json", LabeledData, self._task.get_annotations, "annotations"
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
                saved_task = TaskRead._new_from_openapi_data(**json.load(task_json_file))
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
        return len(self._active_frame_indexes)


@attrs.frozen
class ExtractSingleLabelIndex:
    def __call__(self, target: Target) -> int:
        tags = target.annotations.tags
        if not tags:
            raise ValueError("sample has no tags")

        if len(tags) > 1:
            raise ValueError("sample has multiple tags")

        return target.label_id_to_index[tags[0].label_id]


class LabeledBoxes(TypedDict):
    boxes: Sequence[Tuple[float, float, float, float]]
    labels: Sequence[int]


_SUPPORTED_SHAPE_TYPES = frozenset(["rectangle", "polygon", "polyline", "points", "ellipse"])


@attrs.frozen
class ExtractBoundingBoxes:
    include_shape_types: FrozenSet[str] = attrs.field(
        default=_SUPPORTED_SHAPE_TYPES,
        converter=frozenset,
        validator=attrs.validators.deep_iterable(attrs.validators.in_(_SUPPORTED_SHAPE_TYPES)),
        kw_only=True,
    )

    def __call__(self, target: Target) -> LabeledBoxes:
        boxes = []
        labels = []

        for shape in target.annotations.shapes:
            if shape.type.value not in self.include_shape_types:
                continue

            if shape.type.value not in _SUPPORTED_SHAPE_TYPES:
                raise UnsupportedDatasetError(f"Unsupported shape type {shape.type.value!r}")

            if shape.rotation != 0:
                raise UnsupportedDatasetError("Rotated shapes are not supported")

            x_coords = shape.points[0::2]
            y_coords = shape.points[1::2]

            boxes.append((min(x_coords), min(y_coords), max(x_coords), max(y_coords)))
            labels.append(target.label_id_to_index[shape.label_id])

        return LabeledBoxes(boxes=boxes, labels=labels)
