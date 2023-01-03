# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from io import BytesIO
from typing import List

from PIL import Image


def generate_image_file(filename="image.png", size=(50, 50)):
    f = BytesIO()
    image = Image.new("RGB", size=size)
    image.save(f, "jpeg")
    f.name = filename
    f.seek(0)

    return f


def generate_image_files(count) -> List[BytesIO]:
    images = []
    for i in range(count):
        image = generate_image_file(f"{i}.jpeg")
        images.append(image)

    return images
