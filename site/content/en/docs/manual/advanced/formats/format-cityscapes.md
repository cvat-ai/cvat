---
linkTitle: 'Cityscapes'
weight: 16
---

# [Cityscapes](https://www.cityscapes-dataset.com/login/)

- [Format specification](https://github.com/mcordts/cityscapesScripts#the-cityscapes-dataset)

- Supported annotations

  - Polygons (segmentation task)

- Supported attributes
  - 'is_crowd' (boolean, should be defined for labels as `checkbox` -es)
    Specifies if the annotation label can distinguish between different instances.
    If False, the annotation id field encodes the instance id.

# Cityscapes export

Downloaded file: a zip archive of the following structure:

```
.
├── label_color.txt
├── gtFine
│   ├── <subset_name>
│   │   └── <city_name>
│   │       ├── image_0_gtFine_instanceIds.png
│   │       ├── image_0_gtFine_color.png
│   │       ├── image_0_gtFine_labelIds.png
│   │       ├── image_1_gtFine_instanceIds.png
│   │       ├── image_1_gtFine_color.png
│   │       ├── image_1_gtFine_labelIds.png
│   │       ├── ...
└── imgsFine  # if saving images was requested
    └── leftImg8bit
        ├── <subset_name>
        │   └── <city_name>
        │       ├── image_0_leftImg8bit.png
        │       ├── image_1_leftImg8bit.png
        │       ├── ...
```

- `label_color.txt` a file that describes the color for each label

```
# label_color.txt example
# r g b label_name
0 0 0 background
0 255 0 tree
...
```

- `*_gtFine_color.png` class labels encoded by its color.
- `*_gtFine_labelIds.png` class labels are encoded by its index.
- `*_gtFine_instanceIds.png` class and instance labels encoded
  by an instance ID. The pixel values encode class and the individual instance:
  the integer part of a division by 1000 of each ID provides class ID,
  the remainder is the instance ID. If a certain annotation describes multiple
  instances, then the pixels have the regular ID of that class

# Cityscapes annotations import

Uploaded file: a zip archive with the following structure:

```
.
├── label_color.txt # optional
└── gtFine
    └── <city_name>
        ├── image_0_gtFine_instanceIds.png
        ├── image_1_gtFine_instanceIds.png
        ├── ...
```

# Creating task with Cityscapes dataset

Create a task with the labels you need
or you can use the labels and colors of the original dataset.
To work with the Cityscapes format, you must have a black color label
for the background.

Original Cityscapes color map:

<details>

```JSON
[
    {"name": "unlabeled", "color": "#000000", "attributes": []},
    {"name": "egovehicle", "color": "#000000", "attributes": []},
    {"name": "rectificationborder", "color": "#000000", "attributes": []},
    {"name": "outofroi", "color": "#000000", "attributes": []},
    {"name": "static", "color": "#000000", "attributes": []},
    {"name": "dynamic", "color": "#6f4a00", "attributes": []},
    {"name": "ground", "color": "#510051", "attributes": []},
    {"name": "road", "color": "#804080", "attributes": []},
    {"name": "sidewalk", "color": "#f423e8", "attributes": []},
    {"name": "parking", "color": "#faaaa0", "attributes": []},
    {"name": "railtrack", "color": "#e6968c", "attributes": []},
    {"name": "building", "color": "#464646", "attributes": []},
    {"name": "wall", "color": "#66669c", "attributes": []},
    {"name": "fence", "color": "#be9999", "attributes": []},
    {"name": "guardrail", "color": "#b4a5b4", "attributes": []},
    {"name": "bridge", "color": "#966464", "attributes": []},
    {"name": "tunnel", "color": "#96785a", "attributes": []},
    {"name": "pole", "color": "#999999", "attributes": []},
    {"name": "polegroup", "color": "#999999", "attributes": []},
    {"name": "trafficlight", "color": "#faaa1e", "attributes": []},
    {"name": "trafficsign", "color": "#dcdc00", "attributes": []},
    {"name": "vegetation", "color": "#6b8e23", "attributes": []},
    {"name": "terrain", "color": "#98fb98", "attributes": []},
    {"name": "sky", "color": "#4682b4", "attributes": []},
    {"name": "person", "color": "#dc143c", "attributes": []},
    {"name": "rider", "color": "#ff0000", "attributes": []},
    {"name": "car", "color": "#00008e", "attributes": []},
    {"name": "truck", "color": "#000046", "attributes": []},
    {"name": "bus", "color": "#003c64", "attributes": []},
    {"name": "caravan", "color": "#00005a", "attributes": []},
    {"name": "trailer", "color": "#00006e", "attributes": []},
    {"name": "train", "color": "#005064", "attributes": []},
    {"name": "motorcycle", "color": "#0000e6", "attributes": []},
    {"name": "bicycle", "color": "#770b20", "attributes": []},
    {"name": "licenseplate", "color": "#00000e", "attributes": []}
]

```

</details>

Upload images when creating a task:

```
images.zip/
    ├── image_0.jpg
    ├── image_1.jpg
    ├── ...

```

After creating the task, upload the Cityscapes annotations as described
in the previous section.
