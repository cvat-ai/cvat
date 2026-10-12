"""Compare per-class counts from the class-counts endpoint with a COCO annotations file.

Usage: CVAT_USER=... CVAT_PASS=... python3 compare_counts.py <task_id> <instances_val2017.json>

The output in my case matches and will be pasting it in docs to show
"""

import collections
import json
import os
import sys
import urllib.request
from base64 import b64encode

task_id, coco_path = sys.argv[1:3]
coco = json.load(open(coco_path))
names = {c["id"]: c["name"] for c in coco["categories"]}
# CVAT stores each polygon piece of a COCO object as its own shape, and a crowd object as one mask.
expected = collections.Counter()
for a in coco["annotations"]:
    expected[names[a["category_id"]]] += 1 if a["iscrowd"] else len(a["segmentation"])

req = urllib.request.Request(f"http://localhost:8080/api/tasks/{task_id}/class-counts")
auth = b64encode(f"{os.environ['CVAT_USER']}:{os.environ['CVAT_PASS']}".encode()).decode()
req.add_header("Authorization", f"Basic {auth}")
actual = {r["name"]: r["count"] for r in json.load(urllib.request.urlopen(req))["counts"]}

print(f"{'class':<16}{'coco':>8}{'endpoint':>10}")
bad = 0
for name, n in expected.most_common():
    got = actual.get(name, 0)
    bad += got != n
    print(f"{name:<16}{n:>8}{got:>10}{'' if got == n else '   <-- differs'}")
print(f"\ntotal: coco={sum(expected.values())} endpoint={sum(actual.values())}")
print("MATCH" if not bad and actual.keys() <= expected.keys() else f"{bad} classes differ")
