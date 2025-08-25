# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import glob
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


def _list_and_join(root):
    yield from glob.iglob(os.path.join(root, "*"))


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


def _detect_related_images_3D(image_paths: Sequence[str], root_path: str) -> Dict[str, List[str]]:
    """
    Possible 3D formats are:

    velodyne_points/
        data/
            image_01.bin
    IMAGE_00/ # any number?
        data/
            image_01.png

    pointcloud/
        00001.pcd
    related_images/
        00001_pcd/
            image_01.png # or other image

    Default formats:
    - Option 1:
    data/
        image.pcd
        image.png

    - Option 2:
    data/
       image_1/
           image_1.pcd
           context_1.png
           context_2.jpg
    """

    related_images = {}
    latest_dirname = ""
    dirname_files = []
    related_images_exist = False
    velodyne_context_images_dirs = []

    for image_path in sorted(image_paths):
        rel_image_path = os.path.relpath(image_path, root_path)
        name = os.path.splitext(os.path.basename(image_path))[0]
        dirname = os.path.dirname(image_path)
        related_images_dirname = os.path.normpath(os.path.join(dirname, "..", "related_images"))
        related_images[rel_image_path] = []

        if latest_dirname != dirname:
            # Update some data applicable for a subset of paths (within the current dirname)
            latest_dirname = dirname
            related_images_exist = os.path.isdir(related_images_dirname)
            dirname_files = list(_list_and_join(dirname))
            velodyne_context_images_dirs = [
                directory
                for directory in _list_and_join(os.path.normpath(os.path.join(dirname, "..", "..")))
                if os.path.isdir(os.path.join(directory, "data"))
                and re.search(r"image_\d.*", directory, re.IGNORECASE)
            ]

        filtered_dirname_files = list(filter(lambda x: x != image_path, dirname_files))
        if len(filtered_dirname_files) and os.path.basename(dirname) == name:
            # default format (option 2)
            related_images[rel_image_path].extend(
                _prepare_context_list(filtered_dirname_files, root_path)
            )
        else:
            filtered_dirname_files = list(
                filter(
                    lambda x: os.path.splitext(os.path.basename(x))[0] == name,
                    filtered_dirname_files,
                )
            )
            if len(filtered_dirname_files):
                # default format (option 1)
                related_images[rel_image_path].extend(
                    _prepare_context_list(filtered_dirname_files, root_path)
                )

        if related_images_exist:
            related_images_dirname = os.path.join(
                related_images_dirname, "_".join(os.path.basename(image_path).rsplit(".", 1))
            )
            if os.path.isdir(related_images_dirname):
                related_images[rel_image_path].extend(
                    _prepare_context_list(_list_and_join(related_images_dirname), root_path)
                )

        if dirname.endswith(os.path.join("velodyne_points", "data")):
            # velodynepoints format
            for context_images_dir in velodyne_context_images_dirs:
                context_files = _list_and_join(os.path.join(context_images_dir, "data"))
                context_files = list(
                    filter(
                        lambda x: os.path.splitext(os.path.basename(x))[0] == name, context_files
                    )
                )
                related_images[rel_image_path].extend(
                    _prepare_context_list(context_files, root_path)
                )

        related_images[rel_image_path].sort()
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
