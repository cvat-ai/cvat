# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import io
import mimetypes
import os
import re
import struct
from enum import Enum
from pathlib import Path
from random import shuffle
from typing import Collection, Dict, List, Optional, Sequence, Set, Tuple, Union

import cv2 as cv
import numpy as np
from av import VideoFrame
from natsort import os_sorted
from PIL import Image


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


def md5_hash(frame: Union[str, Image.Image, VideoFrame, io.RawIOBase]) -> str:
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


def _define_data_type(path: str) -> str:
    return mimetypes.guess_type(path)[0]


def is_video(media_file: str) -> bool:
    data_type = _define_data_type(media_file)
    return data_type is not None and data_type.startswith("video")


def is_image(media_file: str) -> bool:
    data_type = _define_data_type(media_file)
    return (
        data_type is not None
        and data_type.startswith("image")
        and not data_type.startswith(("image/svg", "image/x.point-cloud-data"))
    )


def is_point_cloud(media_file: str) -> bool:
    return os.path.splitext(media_file)[1].lower() in (".pcd", ".bin")


def _prepare_context_list(files, base_dir):
    return sorted(os.path.relpath(x, base_dir) for x in filter(is_image, files))


def _find_related_images_2D(
    dataset_paths: Sequence[str],
    *,
    scene_paths: Optional[Collection[str]] = None,
) -> Tuple[Set[str], Dict[str, List[str]]]:
    """
    Expected 2D format is:

    data/
      00001.png
      related_images/
        00001_png/
          context_image_1.jpeg
          context_image_2.png
    """

    regular_images = set()
    related_images = {}
    for image_path in dataset_paths:
        parents = Path(image_path).parents
        if len(parents) >= 2 and parents[1].name == "related_images":
            regular_image_path = parents[2] / ".".join(parents[0].name.rsplit("_", maxsplit=1))
            related_images.setdefault(str(regular_image_path), []).append(image_path)
        elif scene_paths is None or image_path in scene_paths:
            regular_images.add(image_path)

    related_images = {
        image_path: _prepare_context_list(image_related, "")
        for image_path, image_related in related_images.items()
        if image_related
        if image_path in regular_images
    }

    # TODO: maybe add logging for unmatched related images

    return regular_images, related_images


def _find_related_images_3D(
    dataset_paths: Sequence[str],
    *,
    scene_paths: Optional[Collection[str]] = None,
) -> Tuple[List[str], Dict[str, List[str]]]:
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
    Homepage: https://docs.supervisely.com/customization-and-integration/00_ann_format_navi
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

    scenes: Dict[str, str] = {
        os.path.splitext(p)[0]: p
        for p in dataset_paths
        if p.lower().endswith((".pcd", ".bin"))
        if scene_paths is None or p in scene_paths
    }  # { scene name -> scene path }

    related_images: Dict[str, List[str]] = {}  # { scene_name -> [related images] }
    for image_path in dataset_paths:
        image_name, image_ext = os.path.splitext(image_path)
        if image_ext.lower() in (".pcd", ".bin"):
            continue

        if image_name in scenes:
            # Custom 1
            related_images.setdefault(scenes[image_name], []).append(image_path)
            continue

        parsed_path = Path(image_path)
        parents = parsed_path.parents
        if not parents:
            # TODO: maybe add logging
            continue

        scene_name = str(parents[0] / parents[0].name)
        if parents and scene_name in scenes:
            # Custom 2
            related_images.setdefault(scenes[scene_name], []).append(image_path)
            continue

        scene_stem = parents[0].name.rsplit("_", maxsplit=1)[0]
        if (
            len(parents) >= 2
            and parents[1].name == "related_images"
            and (scene_name := str(parents[1].parent / "pointcloud" / scene_stem))
            and scene_name in scenes
        ):
            # Supervisely Point Cloud
            related_images.setdefault(scenes[scene_name], []).append(image_path)
            continue

        if (
            len(parents) >= 2
            and parents[0].name == "data"
            and (re.match(r"image_\d+", parents[1].name, re.IGNORECASE))
            and (
                scene_name := str(parents[1].parent / "velodyne_points" / "data" / parsed_path.stem)
            )
            and scene_name in scenes
        ):
            # KITTI RAW
            related_images.setdefault(scenes[scene_name], []).append(image_path)
            continue

        # TODO: maybe add logging for unmatched related images

    related_images = {
        scene_path: _prepare_context_list(scene_related, "")
        for scene_path, scene_related in related_images.items()
        if scene_related
    }

    return set(scenes.values()), related_images


def find_related_images(
    dataset_paths: Sequence[str],
    *,
    root_path: Optional[str] = None,
    scene_paths: Optional[Collection[str]] = None,
) -> Tuple[Set[str], Dict[str, List[str]]]:
    """
    Finds related images for scenes in the dataset.

    :param dataset_paths: a list of file paths in the dataset
    :param root_path: Optional. If specified, the resulting paths will be relative to this path
    :param scene_paths: Optional. If specified, the results will only include scenes from this list

    Returns: a 2-tuple (scene paths, related_images)
        scene_paths - a list of scene paths found;
        related_images - a dict {scene path -> [related image paths]}
    """

    if root_path:
        dataset_paths = [os.path.relpath(p, root_path) for p in dataset_paths]

        if scene_paths is not None:
            scene_paths = (os.path.relpath(p, root_path) for p in scene_paths)

    if scene_paths and not isinstance(scene_paths, set):
        scene_paths = set(scene_paths)

    dimensions = detect_media_dimension(scene_paths or dataset_paths)
    has_2d_data = MediaDimension.dim_2d in dimensions
    has_3d_data = MediaDimension.dim_3d in dimensions
    if scene_paths is not None and has_3d_data and has_2d_data:
        raise ValueError("Combined data types 2D and 3D are not supported")

    if has_3d_data:
        return _find_related_images_3D(dataset_paths, scene_paths=scene_paths)
    else:
        return _find_related_images_2D(dataset_paths, scene_paths=scene_paths)


class MediaDimension(str, Enum):
    dim_2d = "2d"
    dim_3d = "3d"

    def __str__(self):
        return self.value


def detect_media_dimension(dataset_paths: Sequence[str]) -> Collection[MediaDimension]:
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


class InvalidPcdError(Exception):
    pass


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
    def parse_pcd_header(
        cls, fp: Union[os.PathLike[str], io.IOBase], *, verify_version: bool = False
    ) -> Dict[str, str]:
        if not hasattr(fp, "read"):
            with open(fp, "rb") as file:
                return cls.parse_pcd_header(file, verify_version=verify_version)

        properties = {}

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
            if properties.get("VERSION", None) not in cls.ALLOWED_VERSIONS:
                raise InvalidPcdError("Unsupported pcd version")

        return properties

    @classmethod
    def parse_bin_header(cls, fp: Union[os.PathLike[str], io.IOBase]) -> dict[str, float]:
        if not hasattr(fp, "read"):
            with open(fp, "rb") as f:
                return cls.parse_bin_header(f)

        properties = {}
        size_float = 4
        buffer = fp.read(size_float * 4)
        if not buffer:
            raise InvalidPcdError("failed to parse bin pcd header")

        try:
            x, y, z, intensity = struct.unpack("ffff", buffer)
        except struct.error as e:
            raise InvalidPcdError("failed to parse bin pcd header") from e

        properties["x"] = x
        properties["y"] = y
        properties["z"] = z
        properties["intensity"] = intensity

        return properties

    @classmethod
    def convert_bin_to_pcd(cls, path: str, *, delete_source: bool = True) -> str:
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
        with open(path, "rb") as f:
            size_float = 4
            byte = f.read(size_float * 4)
            while byte:
                x, y, z, intensity = struct.unpack("ffff", byte)
                list_pcd.append([x, y, z, intensity])
                byte = f.read(size_float * 4)
        np_pcd = np.asarray(list_pcd)

        pcd_filename = os.path.splitext(path)[0] + ".pcd"
        with open(pcd_filename, "w") as f:
            write_header(f, np_pcd.shape[0], 1)
        with open(pcd_filename, "ab") as f:
            f.write(np_pcd.astype("float32").tobytes())

        if delete_source:
            os.remove(path)

        return pcd_filename
