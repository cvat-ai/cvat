# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from pathlib import Path
from typing import Tuple

from cvat_sdk.core.helpers import TqdmProgressReporter
from tqdm import tqdm


def make_pbar(file, **kwargs):
    return TqdmProgressReporter(tqdm(file=file, mininterval=0, **kwargs))


def generate_coco_json(filename: Path, img_info: Tuple[Path, int, int]):
    image_filename, image_width, image_height = img_info

    content = generate_coco_anno(
        image_filename.name,
        image_width=image_width,
        image_height=image_height,
    )
    with open(filename, "w") as coco:
        coco.write(content)


def generate_coco_anno(image_path: str, image_width: int, image_height: int) -> str:
    return (
        textwrap.dedent(
            """
    {
        "categories": [
            {
                "id": 1,
                "name": "car",
                "supercategory": ""
            },
            {
                "id": 2,
                "name": "person",
                "supercategory": ""
            }
        ],
        "images": [
            {
                "coco_url": "",
                "date_captured": "",
                "flickr_url": "",
                "license": 0,
                "id": 0,
                "file_name": "%(image_path)s",
                "height": %(image_height)d,
                "width": %(image_width)d
            }
        ],
        "annotations": [
            {
                "category_id": 1,
                "id": 1,
                "image_id": 0,
                "iscrowd": 0,
                "segmentation": [
                    []
                ],
                "area": 17702.0,
                "bbox": [
                    574.0,
                    407.0,
                    167.0,
                    106.0
                ]
            }
        ]
    }
    """
        )
        % {
            "image_path": image_path,
            "image_height": image_height,
            "image_width": image_width,
        }
    )
