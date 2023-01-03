# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import os
import os.path as osp
import unittest
from typing import Any, Union

from shared.utils.helpers import generate_image_file


def run_cli(test: Union[unittest.TestCase, Any], *args: str, expected_code: int = 0) -> None:
    from cvat_cli.__main__ import main

    if isinstance(test, unittest.TestCase):
        # Unittest
        test.assertEqual(expected_code, main(args), str(args))
    else:
        # Pytest case
        assert expected_code == main(args)


def generate_images(dst_dir: str, count: int):
    filenames = []
    os.makedirs(dst_dir, exist_ok=True)
    for i in range(count):
        filename = osp.join(dst_dir, f"img_{i}.jpg")
        with open(filename, "wb") as f:
            f.write(generate_image_file().getvalue())
        filenames.append(filename)
    return filenames
