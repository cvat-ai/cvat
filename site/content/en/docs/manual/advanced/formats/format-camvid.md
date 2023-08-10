---
linkTitle: 'CamVid'
weight: 10
---

# [CamVid](http://mi.eng.cam.ac.uk/research/projects/VideoRec/CamVid/)

- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/camvid_dataset)

## CamVid export

Downloaded file: a zip archive of the following structure:

```bash
taskname.zip/
├── label_colors.txt # optional, required for non-CamVid labels
├── <any_subset_name>/
|   ├── image1.png
|   └── image2.png
├── <any_subset_name>annot/
|   ├── image1.png
|   └── image2.png
└── <any_subset_name>.txt

# label_colors.txt (with color value type)
# if you want to manually set the color for labels, configure label_colors.txt as follows:
# color (RGB) label
0 0 0 Void
64 128 64 Animal
192 0 128 Archway
0 128 192 Bicyclist
0 128 64 Bridge

# label_colors.txt (without color value type)
# if you do not manually set the color for labels, it will be set automatically:
# label
Void
Animal
Archway
Bicyclist
Bridge
```

Mask is a `png` image with 1 or 3 channels where each pixel
has own color which corresponds to a label.
`(0, 0, 0)` is used for background by default.

- supported annotations: Rectangles, Polygons

## CamVid import

Uploaded file: a zip archive of the structure above

- supported annotations: Polygons
