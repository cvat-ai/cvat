# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import io
import json
import math
import mimetypes
import os
import re
import struct
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from enum import Enum
from functools import partial
from pathlib import Path, PurePath
from random import shuffle
from typing import IO, Literal, Protocol, TypeAlias, TypeVar

import cv2 as cv
import numpy as np
from av import VideoFrame
from natsort import os_sorted
from PIL import Image

from .errors import InvalidPcdError, InvalidRelatedImageMetadataError


class Openable(Protocol):
    # The mode is required so that Path can be used as an Openable.
    def open(self, mode: Literal["rb"]) -> IO[bytes]: ...


class NamedOpenable(Openable, Protocol):
    def __fspath__(self) -> str: ...  # Must return the path that should be used for sorting.


class MemOpenable:
    def __init__(self, contents: bytes) -> None:
        self._contents = contents

    def open(self, mode: str) -> IO[bytes]:
        assert mode == "rb"
        return io.BytesIO(self._contents)


class MemNamedOpenable(MemOpenable):
    def __init__(self, contents: bytes, path: str) -> None:
        super().__init__(contents)
        self._path = path

    def __fspath__(self) -> str:
        return self._path


def rotate_image(image, angle):
    height, width = image.shape[:2]
    image_center = (width / 2, height / 2)
    matrix = cv.getRotationMatrix2D(image_center, angle, 1.0)
    abs_cos = abs(matrix[0, 0])
    abs_sin = abs(matrix[0, 1])
    bound_w = int(height * abs_sin + width * abs_cos)
    bound_h = int(height * abs_cos + width * abs_sin)
    matrix[0, 2] += bound_w / 2 - image_center[0]
    matrix[1, 2] += bound_h / 2 - image_center[1]
    matrix = cv.warpAffine(image, matrix, (bound_w, bound_h))
    return matrix


def md5_hash(frame: str | Image.Image | VideoFrame | IO[bytes]) -> str:
    buffer = frame

    if isinstance(buffer, str):
        buffer = Path(buffer).read_bytes()

    if hasattr(buffer, "read"):
        buffer = buffer.read()

    if isinstance(buffer, VideoFrame):
        buffer = buffer.to_image()

    if isinstance(buffer, Image.Image):
        buffer = buffer.tobytes()

    return hashlib.md5(buffer).hexdigest()  # nosec


def _define_data_type(path: PurePath) -> str | None:
    return mimetypes.guess_type(path)[0]


def is_video(media_file: PurePath) -> bool:
    data_type = _define_data_type(media_file)
    return data_type is not None and data_type.startswith("video")


def is_image(media_file: PurePath) -> bool:
    data_type = _define_data_type(media_file)
    return (
        data_type is not None
        and data_type.startswith("image")
        and not data_type.startswith(
            ("image/svg", "image/x.point-cloud-data", "image/x.kitti-velodyne")
        )
    )


def is_point_cloud(media_file: PurePath) -> bool:
    return media_file.suffix.lower() in (".pcd", ".bin")


_AnyPath = TypeVar("_AnyPath", bound=PurePath)
_IMAGE_METADATA_FORMAT = "cvat-image-meta"
_IMAGE_METADATA_VERSION = 1
_CAMERA_ROTATION_TOLERANCE = 1e-5


@dataclass(frozen=True)
class RelatedImageMetadata:
    # A row-major 3x3 camera intrinsic matrix (9 elements).
    intrinsic_matrix: list[float]

    # A row-major 3x4 camera extrinsic matrix (12 elements).
    extrinsic_matrix: list[float]


RelatedImageMetadataLoader: TypeAlias = Callable[[], RelatedImageMetadata | None]


def _parse_calibration_matrix(
    matrix: object,
    *,
    name: str,
    rows: int,
    columns: int,
    sidecar_path: Path,
) -> list[float]:
    if not isinstance(matrix, list) or len(matrix) != rows:
        raise InvalidRelatedImageMetadataError(
            sidecar_path,
            f"'{name}' must be a {rows}x{columns} matrix",
        )

    flattened_matrix: list[float] = []
    for row in matrix:
        if not isinstance(row, list) or len(row) != columns:
            raise InvalidRelatedImageMetadataError(
                sidecar_path,
                f"'{name}' must be a {rows}x{columns} matrix",
            )

        for value in row:
            if isinstance(value, bool) or not isinstance(value, int | float):
                raise InvalidRelatedImageMetadataError(
                    sidecar_path,
                    f"'{name}' must contain only finite numbers",
                )

            try:
                float_value = float(value)
            except OverflowError:
                raise InvalidRelatedImageMetadataError(
                    sidecar_path,
                    f"'{name}' must contain only finite numbers",
                )

            if not math.isfinite(float_value):
                raise InvalidRelatedImageMetadataError(
                    sidecar_path,
                    f"'{name}' must contain only finite numbers",
                )

            flattened_matrix.append(float_value)

    return flattened_matrix


def _parse_flattened_calibration_matrix(
    matrix: object,
    *,
    name: str,
    rows: int,
    columns: int,
    sidecar_path: Path,
) -> list[float]:
    if not isinstance(matrix, list) or len(matrix) != rows * columns:
        raise InvalidRelatedImageMetadataError(
            sidecar_path,
            f"'{name}' must be a flattened {rows}x{columns} matrix",
        )

    return _parse_calibration_matrix(
        [matrix[row * columns : (row + 1) * columns] for row in range(rows)],
        name=name,
        rows=rows,
        columns=columns,
        sidecar_path=sidecar_path,
    )


def _validate_related_image_metadata(
    intrinsic_matrix: list[float],
    extrinsic_matrix: list[float],
    *,
    intrinsic_matrix_name: str,
    extrinsic_matrix_name: str,
    sidecar_path: Path,
) -> RelatedImageMetadata:
    try:
        np.linalg.inv(np.asarray(intrinsic_matrix).reshape(3, 3))
    except np.linalg.LinAlgError:
        raise InvalidRelatedImageMetadataError(
            sidecar_path,
            f"'{intrinsic_matrix_name}' must be invertible",
        )

    rotation = np.asarray(extrinsic_matrix).reshape(3, 4)[:, :3]
    # check orthogonality
    if not np.allclose(
        rotation.T @ rotation,
        np.identity(3),
        atol=_CAMERA_ROTATION_TOLERANCE,
        rtol=0,
    ) or not np.isclose(  # exclude mirror/reflection matrices
        np.linalg.det(rotation),
        1,
        atol=_CAMERA_ROTATION_TOLERANCE,
        rtol=0,
    ):
        raise InvalidRelatedImageMetadataError(
            sidecar_path,
            f"'{extrinsic_matrix_name}' must contain a rigid rotation and translation",
        )
    # any finite translation is valid and we already checked it

    return RelatedImageMetadata(
        intrinsic_matrix=intrinsic_matrix,
        extrinsic_matrix=extrinsic_matrix,
    )


def _load_related_image_sidecar(
    sidecar_path: PurePath,
) -> tuple[Path, dict[str, object]] | None:
    sidecar_path = Path(sidecar_path)
    if not sidecar_path.is_file():
        return None

    try:
        with sidecar_path.open(encoding="utf-8") as sidecar_file:
            sidecar = json.load(sidecar_file)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InvalidRelatedImageMetadataError(sidecar_path, f"could not read parse JSON ({exc})")

    if not isinstance(sidecar, dict):
        raise InvalidRelatedImageMetadataError(sidecar_path, "the root value must be an object")

    return sidecar_path, sidecar


def _load_standard_related_image_metadata(
    sidecar_path: PurePath,
) -> RelatedImageMetadata | None:
    sidecar_data = _load_related_image_sidecar(sidecar_path)
    if sidecar_data is None:
        return None

    sidecar_path, sidecar = sidecar_data

    # replace with jsonschema validation if the schema grows more complex
    if sidecar.get("format") != _IMAGE_METADATA_FORMAT:
        raise InvalidRelatedImageMetadataError(
            sidecar_path,
            f"Unrecognized format; must be '{_IMAGE_METADATA_FORMAT}'",
        )

    version = sidecar.get("version")
    if (
        isinstance(version, bool)
        or not isinstance(version, int)
        or version != _IMAGE_METADATA_VERSION
    ):
        raise InvalidRelatedImageMetadataError(
            sidecar_path,
            f"Unexpected format version; must be {_IMAGE_METADATA_VERSION}",
        )

    camera = sidecar.get("camera")
    if not isinstance(camera, dict):
        raise InvalidRelatedImageMetadataError(
            sidecar_path, "Unexpected structure; 'camera' must be an object"
        )

    intrinsic_matrix = _parse_calibration_matrix(
        camera.get("intrinsic_matrix"),
        name="camera.intrinsic_matrix",
        rows=3,
        columns=3,
        sidecar_path=sidecar_path,
    )
    extrinsic_matrix = _parse_calibration_matrix(
        sidecar.get("extrinsic_matrix"),
        name="extrinsic_matrix",
        rows=3,
        columns=4,
        sidecar_path=sidecar_path,
    )

    return _validate_related_image_metadata(
        intrinsic_matrix,
        extrinsic_matrix,
        intrinsic_matrix_name="camera.intrinsic_matrix",
        extrinsic_matrix_name="extrinsic_matrix",
        sidecar_path=sidecar_path,
    )


def _load_sly_related_image_metadata(
    sidecar_path: PurePath,
) -> RelatedImageMetadata | None:
    sidecar_data = _load_related_image_sidecar(sidecar_path)
    if sidecar_data is None:
        return None

    sidecar_path, sidecar = sidecar_data
    meta = sidecar.get("meta")
    if meta is None:
        return None
    if not isinstance(meta, dict):
        raise InvalidRelatedImageMetadataError(sidecar_path, "Unexpected structure; 'meta' must be an object")

    sensors_data = meta.get("sensorsData")
    if sensors_data is None:
        return None
    if not isinstance(sensors_data, dict):
        raise InvalidRelatedImageMetadataError(sidecar_path, "Unexpected structure; 'meta.sensorsData' must be an object")

    intrinsic_matrix = _parse_flattened_calibration_matrix(
        sensors_data.get("intrinsicMatrix"),
        name="meta.sensorsData.intrinsicMatrix",
        rows=3,
        columns=3,
        sidecar_path=sidecar_path,
    )
    extrinsic_matrix = _parse_flattened_calibration_matrix(
        sensors_data.get("extrinsicMatrix"),
        name="meta.sensorsData.extrinsicMatrix",
        rows=3,
        columns=4,
        sidecar_path=sidecar_path,
    )

    # Supervisely uses W->C. Its point cloud is expressed in W, which is CVAT's L space.
    return _validate_related_image_metadata(
        intrinsic_matrix,
        extrinsic_matrix,
        intrinsic_matrix_name="meta.sensorsData.intrinsicMatrix",
        extrinsic_matrix_name="meta.sensorsData.extrinsicMatrix",
        sidecar_path=sidecar_path,
    )


def _prepare_context_list(files: Iterable[_AnyPath], base_dir: _AnyPath | None = None):
    return sorted(
        x.relative_to(base_dir) if base_dir is not None else x for x in filter(is_image, files)
    )


def _find_related_images_2D(
    dataset_paths: Sequence[_AnyPath],
    *,
    is_scene_path: Callable[[_AnyPath], bool] | None = None,
) -> tuple[set[_AnyPath], dict[_AnyPath, list[_AnyPath]]]:
    """
    Expected 2D format is:

    data/
      00001.png
      related_images/
        00001_png/
          context_image_1.jpeg
          context_image_2.png
    """

    regular_images: set[_AnyPath] = set()
    related_images: dict[_AnyPath, list[_AnyPath]] = {}
    for image_path in dataset_paths:
        parents = image_path.parents
        if len(parents) >= 3 and parents[1].name == "related_images":
            regular_image_path = parents[2] / ".".join(parents[0].name.rsplit("_", maxsplit=1))
            related_images.setdefault(regular_image_path, []).append(image_path)
        elif is_scene_path is None or is_scene_path(image_path):
            regular_images.add(image_path)

    related_images = {
        image_path: _prepare_context_list(image_related)
        for image_path, image_related in related_images.items()
        if image_related
        if image_path in regular_images
    }

    # TODO: maybe add logging for unmatched related images

    return regular_images, related_images


def _find_related_images_3D(
    dataset_paths: Sequence[_AnyPath],
) -> tuple[
    set[_AnyPath],
    dict[_AnyPath, list[_AnyPath]],
    dict[_AnyPath, RelatedImageMetadataLoader],
]:
    """
    Supported 3D formats:

    1. KITTI RAW
    Homepage: https://www.cvlibs.net/datasets/kitti/raw_data.php
    Example: https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/kitti_dataset/kitti_raw

    Layout:
    dataset/
        velodyne_points/
            data/
                <scene name>.bin
        IMAGE_00/ # any number (00 - 03 originally)
            data/
                <scene name>.<image ext>

    2. Supervisely Point Cloud
    Homepage: https://docs.sly.com/customization-and-integration/00_ann_format_navi
    Example: https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/sly_pointcloud_dataset/ds0

    Layout:
    dataset/
        pointcloud/
            <pcd name>.pcd
        related_images/
            <pcd name>_pcd/
                <any image name>.<image ext>

    3. Custom 1
    Layout:
    dataset/
        <scene name>.pcd
        <scene name>.<image ext>

    4. Custom 2
    Layout:
    dataset/
       <pcd name>/
           <pcd name>.pcd
           <any image name>.<image ext>
    """
    # There's no point in disallowing multiple layouts simultaneously, but mixing is
    # unlikely to be encountered

    scenes: dict[_AnyPath, _AnyPath] = {
        p.with_suffix(""): p for p in dataset_paths if p.suffix.lower() in (".pcd", ".bin")
    }  # { scene name -> scene path }

    related_images: dict[_AnyPath, list[_AnyPath]] = {}  # { scene_name -> [related images] }
    related_image_metadata: dict[_AnyPath, RelatedImageMetadataLoader] = {}
    for image_path in dataset_paths:
        image_name = image_path.with_suffix("")
        if image_path.suffix.lower() in (".pcd", ".bin"):
            continue

        if image_name in scenes:
            # Custom 1
            related_images.setdefault(scenes[image_name], []).append(image_path)
            related_image_metadata[image_path] = partial(
                _load_standard_related_image_metadata,
                image_path.parent / f"{image_path.name}.json",
            )
            continue

        parents = image_path.parents
        if not parents:
            # TODO: maybe add logging
            continue

        scene_name = parents[0] / parents[0].name
        if parents and scene_name in scenes:
            # Custom 2
            related_images.setdefault(scenes[scene_name], []).append(image_path)
            related_image_metadata[image_path] = partial(
                _load_standard_related_image_metadata,
                image_path.parent / f"{image_path.name}.json",
            )
            continue

        scene_stem = parents[0].name.rsplit("_", maxsplit=1)[0]
        if (
            len(parents) >= 2
            and parents[1].name == "related_images"
            and (scene_name := parents[1].parent / "pointcloud" / scene_stem)
            and scene_name in scenes
        ):
            # Supervisely Point Cloud
            related_images.setdefault(scenes[scene_name], []).append(image_path)
            related_image_metadata[image_path] = partial(
                _load_sly_related_image_metadata,
                image_path.parent / f"{image_path.name}.json",
            )
            continue

        if (
            len(parents) >= 2
            and parents[0].name == "data"
            and (re.match(r"image_\d+", parents[1].name, re.IGNORECASE))
            and (scene_name := parents[1].parent / "velodyne_points" / "data" / image_path.stem)
            and scene_name in scenes
        ):
            # KITTI RAW
            related_images.setdefault(scenes[scene_name], []).append(image_path)
            # No calibration data present in the raw format archive
            continue

        # TODO: maybe add logging for unmatched related images

    related_images = {
        scene_path: _prepare_context_list(scene_related)
        for scene_path, scene_related in related_images.items()
        if scene_related
    }
    related_image_paths = {
        image_path for image_paths in related_images.values() for image_path in image_paths
    }
    related_image_metadata = {
        image_path: metadata
        for image_path, metadata in related_image_metadata.items()
        if image_path in related_image_paths
    }

    return set(scenes.values()), related_images, related_image_metadata


def find_related_images(
    dataset_paths: Sequence[_AnyPath],
    *,
    root_path: _AnyPath | None = None,
    is_scene_path: Callable[[_AnyPath], bool] | None = None,
) -> tuple[
    set[_AnyPath],
    dict[_AnyPath, list[_AnyPath]],
    dict[_AnyPath, RelatedImageMetadataLoader],
]:
    """
    Finds related images for scenes in the dataset.

    :param dataset_paths: a list of file paths in the dataset
    :param root_path: Optional. If specified, the resulting paths will be relative to this path
    :param is_scene_path: Optional. If specified, the results will only include scenes
        matching this function.

    Returns: a 3-tuple (scene paths, related_images, related_image_metadata)
        scene_paths - a list of scene paths found;
        related_images - a dict {scene path -> [related image paths]}
        related_image_metadata - a dict {related image path -> metadata loader}
    """

    if root_path:
        dataset_paths = [p.relative_to(root_path) for p in dataset_paths]

    has_images = False
    has_pcd = False
    has_videos = False
    for p in (filter(is_scene_path, dataset_paths) if callable(is_scene_path) else dataset_paths):
        if is_point_cloud(p):
            has_pcd |= True
        elif is_image(p):
            has_images |= True
        elif is_video(p):
            has_videos |= True

    if has_videos and (has_pcd or has_images):
        raise ValueError(
            "Combined media types are not supported, found: {}".format(
                ", ".join(
                    (["video"] if has_videos else [])
                    + (["images"] if has_images else [])
                    + (["3d point clouds"] if has_pcd else [])
                )
            )
        )

    if has_pcd:
        # get all found scenes and RIs to avoid complaining about excluded scenes
        scenes, related_images, related_image_metadata = _find_related_images_3D(dataset_paths)

        unknown_files = set(dataset_paths)
        unknown_files.difference_update(scenes)
        unknown_files.difference_update(ri for ris in related_images.values() for ri in ris)

        if any(is_image(f) for f in unknown_files):
            has_images = True
            raise ValueError(
                "Combined media types are not supported, found: {}. "
                "Scenes: {}. Unknown files: {}".format(
                    ", ".join(
                        (["video"] if has_videos else [])
                        + (["images"] if has_images else [])
                        + (["3d point clouds"] if has_pcd else [])
                    ),
                    ", ".join(sorted(map(os.fspath, scenes))[:5])
                    + ("..." if len(scenes) > 5 else ""),
                    ", ".join(sorted(map(os.fspath, unknown_files))[:5])
                    + ("..." if len(unknown_files) > 5 else ""),
                )
            )

        # Apply the scene filter
        if is_scene_path is not None:
            scenes = {p for p in scenes if is_scene_path(p)}

            related_images = {
                scene: scene_ris for scene, scene_ris in related_images.items() if scene in scenes
            }
            related_image_paths = {
                image_path for image_paths in related_images.values() for image_path in image_paths
            }
            related_image_metadata = {
                image_path: metadata
                for image_path, metadata in related_image_metadata.items()
                if image_path in related_image_paths
            }
    else:
        scenes, related_images = _find_related_images_2D(dataset_paths, is_scene_path=is_scene_path)
        related_image_metadata = {}  # No metadata for images related to 2D scenes yet

    return scenes, related_images, related_image_metadata


class MediaDimension(str, Enum):
    dim_2d = "2d"
    dim_3d = "3d"

    def __str__(self):
        return self.value


def detect_media_dimension(dataset_paths: Sequence[PurePath]) -> set[MediaDimension]:
    detected_dimensions = set()

    for path in dataset_paths:
        if is_image(path) or is_video(path):
            detected_dimensions.add(MediaDimension.dim_2d)
        elif is_point_cloud(path):
            detected_dimensions.add(MediaDimension.dim_3d)

    return detected_dimensions


class SortingMethod(str, Enum):
    LEXICOGRAPHICAL = "lexicographical"
    NATURAL = "natural"
    PREDEFINED = "predefined"
    RANDOM = "random"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


def sort(images, sorting_method=SortingMethod.LEXICOGRAPHICAL, func=None):
    if sorting_method == SortingMethod.LEXICOGRAPHICAL:
        return sorted(images, key=func)
    elif sorting_method == SortingMethod.NATURAL:
        return os_sorted(images, key=func)
    elif sorting_method == SortingMethod.PREDEFINED:
        return images
    elif sorting_method == SortingMethod.RANDOM:
        shuffle(images)
        return images
    else:
        raise NotImplementedError()


class PcdReader:
    ALLOWED_VERSIONS = (
        "0.7",
        "0.6",
        "0.5",
        "0.4",
        "0.3",
        "0.2",
        "0.1",
        ".7",
        ".6",
        ".5",
        ".4",
        ".3",
        ".2",
        ".1",
    )

    @classmethod
    def parse_pcd_header(cls, pcd: Openable, *, verify_version: bool = False) -> dict[str, str]:
        properties = {}

        with pcd.open("rb") as fp:
            for line_number, line in enumerate(fp):
                try:
                    line = line.decode("utf-8")
                except UnicodeDecodeError as e:
                    raise InvalidPcdError(f"line {line_number}: failed to parse pcd header") from e

                if line.startswith("#"):
                    continue

                line_parts = line.split(" ", maxsplit=1)
                if len(line_parts) != 2:
                    raise InvalidPcdError(f"line {line_number}: invalid line format")

                k, v = line_parts
                properties[k.upper()] = v.strip()
                if "DATA" in line:
                    break

        if verify_version:
            version = properties.get("VERSION", None)
            if version not in cls.ALLOWED_VERSIONS:
                raise InvalidPcdError("Unsupported pcd version{}".format(f" {version}" or ""))

        return properties

    @classmethod
    def parse_bin_header(cls, pcd: Openable) -> dict[str, float]:
        size_float = 4
        line_size = 4 * size_float

        with pcd.open("rb") as fp:
            buffer = fp.read(line_size)

        if not buffer or len(buffer) != line_size:
            raise InvalidPcdError("failed to parse bin pcd header")

        try:
            x, y, z, intensity = struct.unpack("ffff", buffer)
        except struct.error as e:
            raise InvalidPcdError("failed to parse bin pcd header") from e

        properties = {}
        properties["x"] = x
        properties["y"] = y
        properties["z"] = z
        properties["intensity"] = intensity

        return properties

    @classmethod
    def convert_bin_to_pcd(cls, path: str, *, delete_source: bool = True) -> str:
        pcd_filename = os.path.splitext(path)[0] + ".pcd"
        with open(pcd_filename, "wb") as f:
            cls.convert_bin_to_pcd_file(Path(path), output_file=f)

        if delete_source:
            os.remove(path)

        return pcd_filename

    @classmethod
    def convert_bin_to_pcd_buffer(cls, bin_: Openable) -> bytes:
        output_file = io.BytesIO()
        cls.convert_bin_to_pcd_file(bin_, output_file=output_file)
        return output_file.getvalue()

    @classmethod
    def convert_bin_to_pcd_file(cls, bin_: Openable, *, output_file: IO[bytes]) -> None:
        def write_header(file_obj: io.TextIOBase, width: int, height: int):
            file_obj.writelines(
                f"{line}\n"
                for line in [
                    "VERSION 0.7",
                    "FIELDS x y z intensity",
                    "SIZE 4 4 4 4",
                    "TYPE F F F F",
                    "COUNT 1 1 1 1",
                    f"WIDTH {width}",
                    f"HEIGHT {height}",
                    "VIEWPOINT 0 0 0 1 0 0 0",
                    f"POINTS {width * height}",
                    "DATA binary",
                ]
            )

        list_pcd = []
        size_float = 4
        line_size = 4 * size_float

        with bin_.open("rb") as fp:
            while buffer := fp.read(line_size):
                if len(buffer) != line_size:
                    raise InvalidPcdError(f"failed to parse bin pcd point at pos {fp.tell()}")

                x, y, z, intensity = struct.unpack("ffff", buffer)
                list_pcd.append([x, y, z, intensity])

        np_pcd = np.asarray(list_pcd)

        output_file_as_text = io.TextIOWrapper(output_file, newline="\n")
        write_header(output_file_as_text, np_pcd.shape[0], 1)
        output_file_as_text.detach()

        output_file.write(np_pcd.astype("float32").tobytes())
