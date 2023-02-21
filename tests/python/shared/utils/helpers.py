# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from io import BytesIO
from typing import Any, Dict, List, Optional

from PIL import Image


def generate_image_file(filename="image.png", size=(50, 50), color=(0, 0, 0)):
    f = BytesIO()
    image = Image.new("RGB", size=size, color=color)
    image.save(f, "jpeg")
    f.name = filename
    f.seek(0)

    return f


def generate_image_files(count, prefixes=None) -> List[BytesIO]:
    images = []
    for i in range(count):
        prefix = prefixes[i] if prefixes else ""
        image = generate_image_file(f"{prefix}{i}.jpeg", color=(i, i, i))
        images.append(image)

    return images


def make_skeleton_label_payload(*, name: Optional[str] = None) -> Dict[str, Any]:
    return {
        "name": name or "skeleton_label",
        "color": "#5c5eba",
        "attributes": [],
        "type": "skeleton",
        "sublabels": [
            {"name": "1", "color": "#d12345", "attributes": [], "type": "points"},
            {"name": "2", "color": "#350dea", "attributes": [], "type": "points"},
        ],
        "svg": '<line x1="19.464284896850586" y1="21.922269821166992" x2="54.08613586425781" y2="43.60293960571289" '
        'stroke="black" data-type="edge" data-node-from="1" stroke-width="0.5" data-node-to="2"></line>'
        '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="19.464284896850586" cy="21.922269821166992" '
        'stroke-width="0.1" data-type="element node" data-element-id="1" data-node-id="1" data-label-id="103"></circle>'
        '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="54.08613586425781" cy="43.60293960571289" '
        'stroke-width="0.1" data-type="element node" data-element-id="2" data-node-id="2" data-label-id="104"></circle>',
    }
