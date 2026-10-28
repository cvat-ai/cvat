"""
Independent per-class counts from a COCO instances file, to check the stats endpoint against.

Usage: python docs/bench/coco_expected_counts.py annotations/instances_val2017.json [N_IMAGES]

With N_IMAGES, only the first N images by file name are counted (the order CVAT sorts uploads in).
"annotations" is one per COCO annotation; "parts" counts each polygon of a multi-polygon
annotation separately, since an importer may store those as separate shapes.
"""

import json
import sys
from collections import Counter

path = sys.argv[1]
limit = int(sys.argv[2]) if len(sys.argv) > 2 else None

with open(path) as f:
    coco = json.load(f)

images = sorted(coco["images"], key=lambda image: image["file_name"])[:limit]
image_ids = {image["id"] for image in images}
names = {category["id"]: category["name"] for category in coco["categories"]}

annotations, parts = Counter(), Counter()
for ann in coco["annotations"]:
    if ann["image_id"] not in image_ids:
        continue
    name = names[ann["category_id"]]
    annotations[name] += 1
    is_polygon_list = not ann["iscrowd"] and isinstance(ann["segmentation"], list)
    parts[name] += len(ann["segmentation"]) if is_polygon_list else 1

print(f"images={len(images)} annotations={sum(annotations.values())} parts={sum(parts.values())}")
for name, count in annotations.most_common():
    print(f"{name:>16} {count:6d} {parts[name]:6d}")
