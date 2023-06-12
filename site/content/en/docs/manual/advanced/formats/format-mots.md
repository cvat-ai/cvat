---
linkTitle: 'MOTS'
weight: 4
---

# [MOTS PNG](https://www.vision.rwth-aachen.de/page/mots)

- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/mots_dataset)

## MOTS PNG export

Downloaded file: a zip archive of the following structure:

```bash
taskname.zip/
└── <any_subset_name>/
    |   images/
    |   ├── image1.jpg
    |   └── image2.jpg
    └── instances/
        ├── labels.txt
        ├── image1.png
        └── image2.png

# labels.txt
cat
dog
person
...
```

- supported annotations: Rectangle and Polygon tracks

## MOTS PNG import

Uploaded file: a zip archive of the structure above

- supported annotations: Polygon tracks
