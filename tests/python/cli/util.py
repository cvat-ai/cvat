# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import unittest
from pathlib import Path
from typing import Any, List, Union

from shared.utils.helpers import generate_image_file


def run_cli(test: Union[unittest.TestCase, Any], *args: str, expected_code: int = 0) -> None:
    from cvat_cli.__main__ import main

    if isinstance(test, unittest.TestCase):
        # Unittest
        test.assertEqual(expected_code, main(args), str(args))
    else:
        # Pytest case
        assert expected_code == main(args)


def generate_images(dst_dir: Path, count: int) -> List[Path]:
    filenames = []
    dst_dir.mkdir(parents=True, exist_ok=True)
    for i in range(count):
        filename = dst_dir / f"img_{i}.jpg"
        filename.write_bytes(generate_image_file(filename.name).getvalue())
        filenames.append(filename)
    return filenames
