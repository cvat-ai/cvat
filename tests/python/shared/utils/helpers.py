# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import subprocess
from io import BytesIO
from typing import List, Optional

from PIL import Image

from shared.fixtures.init import get_server_image_tag


def generate_image_file(filename="image.png", size=(50, 50), color=(0, 0, 0)):
    f = BytesIO()
    f.name = filename
    image = Image.new("RGB", size=size, color=color)
    image.save(f)
    f.seek(0)

    return f


def generate_image_files(
    count, prefixes=None, *, filenames: Optional[List[str]] = None
) -> List[BytesIO]:
    assert not (prefixes and filenames), "prefixes cannot be used together with filenames"
    assert not prefixes or len(prefixes) == count
    assert not filenames or len(filenames) == count

    images = []
    for i in range(count):
        prefix = prefixes[i] if prefixes else ""
        filename = f"{prefix}{i}.jpeg" if not filenames else filenames[i]
        image = generate_image_file(filename, color=(i, i, i))
        images.append(image)

    return images


def generate_manifest(path: str) -> None:
    command = [
        "docker",
        "run",
        "--rm",
        "-u",
        "root:root",
        "-v",
        f"{path}:/local",
        "--entrypoint",
        "python3",
        get_server_image_tag(),
        "utils/dataset_manifest/create.py",
        "--output-dir",
        "/local",
        "/local",
    ]
    subprocess.check_output(command)
