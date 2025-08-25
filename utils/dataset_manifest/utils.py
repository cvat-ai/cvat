# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import hashlib
import mimetypes
import os
import re
from enum import Enum
from pathlib import Path
from random import shuffle
from typing import Dict, List, Sequence

import cv2 as cv
from av import VideoFrame
from natsort import os_sorted


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


def md5_hash(frame):
    if isinstance(frame, VideoFrame):
        frame = frame.to_image()
    return hashlib.md5(frame.tobytes()).hexdigest()  # nosec


def _define_data_type(media):
    return mimetypes.guess_type(media)[0]


def is_video(media_file):
    data_type = _define_data_type(media_file)
    return data_type is not None and data_type.startswith("video")


def is_image(media_file):
    data_type = _define_data_type(media_file)
    return (
        data_type is not None
        and data_type.startswith("image")
        and not data_type.startswith("image/svg")
    )


def _prepare_context_list(files, base_dir):
    return sorted(os.path.relpath(x, base_dir) for x in filter(is_image, files))


def _detect_related_images_2D(image_paths: Sequence[str], root_path: str) -> Dict[str, List[str]]:
    """
    Expected 2D format is:

    data/
      00001.png
      related_images/
        00001_png/
          context_image_1.jpeg
          context_image_2.png
    """

    image_paths = (os.path.relpath(p, root_path) for p in image_paths)

    regular_images = set()
    related_images = {}
    for image_path in image_paths:
        parents = Path(image_path).parents
        if len(parents) >= 2 and parents[1].name == "related_images":
            regular_image_path = parents[2] / ".".join(parents[0].name.rsplit("_", maxsplit=1))
            related_images.setdefault(str(regular_image_path), []).append(image_path)
        else:
            regular_images.add(image_path)

    related_images = {
        image_path: _prepare_context_list(image_related, "")
        for image_path, image_related in related_images.items()
        if image_related
        if image_path in regular_images
    }

    # TODO: maybe add logging for unmatched related images

    return related_images


def _detect_related_images_3D(file_paths: Sequence[str], root_path: str) -> Dict[str, List[str]]:
    """
    Supported 3D formats:

    1. KITTI RAW
    Homepage: https://www.cvlibs.net/datasets/kitti/raw_data.php
    Example: https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/kitti_dataset/kitti_raw

    Layout:
    velodyne_points/
        data/
            <scene name>.bin # should be .pcd at this point
    IMAGE_00/ # any number (00 - 03 originally)
        data/
            <scene name>.<image ext>

    2. Supervisely Point Cloud
    Homepage: https://docs.supervisely.com/customization-and-integration/00_ann_format_navi
    Example: https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/sly_pointcloud_dataset/ds0

    pointcloud/
        <pcd name>.pcd
    related_images/
        <pcd name>_pcd/
            <any image name>.<image ext>

    3. Custom 1
    data/
        <scene name>.pcd
        <scene name>.<image ext>

    4. Custom 2
    data/
       <pcd name>/
           <pcd name>.pcd
           <any image name>.<image ext>
    """
    # There's no point in disallowing multiple layouts simultaneously, but mixing is
    # unlikely to be encountered

    file_paths = [os.path.relpath(p, root_path) for p in file_paths]

    scenes: Dict[str, str] = {
        os.path.splitext(p)[0]: p for p in file_paths if p.lower().endswith(".pcd")
    }  # { scene name -> scene path }

    related_images: Dict[str, List[str]] = {}  # { scene_name -> [related images] }
    for image_path in file_paths:
        image_name, image_ext = os.path.splitext(image_path)
        if image_ext.lower() == ".pcd":
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

    return related_images


def detect_related_images(image_paths: Sequence[str], root_path: str) -> Dict[str, List[str]]:
    """
    This function is expected to be called only for image-based tasks.

    image_path is expected to be a list of absolute path to images.

    root_path is expected to be a string (dataset root).

    Returns: a dict {regular image path -> [related images]}
    """

    # First of all need to define data type we are working with
    data_is_2d = False
    data_is_3d = False
    for image_path in image_paths:
        # .bin files are expected to be converted to .pcd before this code
        if os.path.splitext(image_path)[1].lower() == ".pcd":
            data_is_3d = True
        else:
            data_is_2d = True
    assert not (data_is_3d and data_is_2d), "Combined data types 2D and 3D are not supported"

    if data_is_2d:
        return _detect_related_images_2D(image_paths, root_path)
    elif data_is_3d:
        return _detect_related_images_3D(image_paths, root_path)

    return {}


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
