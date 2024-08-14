from datumaro.components.annotation import Bbox
from datumaro.components.operations import IntersectMerge
from datumaro.components.annotation import LabelCategories

import datumaro as dm

a1 = dm.DatasetItem(
    id="08122008671",
    annotations=[
        Bbox(
            230.4,
            75.45,
            1305.6,
            1969.46,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=0,
            z_order=0,
        ),
        Bbox(
            275.71,
            398.65,
            223.53000000000003,
            507.47,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=1,
            z_order=0,
        ),
        Bbox(
            257.59,
            5.97,
            380.6000000000001,
            256.76,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=2,
            z_order=0,
        ),
    ],
    media=dm.Image(
        path="/Users/vidit/Downloads/job_18_dataset_2024_05_21_09_45_08_datumaro 1.0/images/default/08122008671.jpg"
    ),
)

a2 = dm.DatasetItem(
    id="08122008671",
    annotations=[
        Bbox(
            248.53,
            383.55,
            329.25,
            534.6600000000001,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=1,
            z_order=0,
        ),
        Bbox(
            438.83,
            93.57,
            1097.17,
            1658.3400000000001,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=0,
            z_order=0,
        ),
        Bbox(
            1384.29,
            220.44,
            151.71000000000004,
            274.88,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=1,
            z_order=0,
        ),
        Bbox(
            236.45,
            2.95,
            468.2,
            302.06,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=2,
            z_order=0,
        ),
    ],
    media=dm.Image(
        path="/Users/vidit/Downloads/job_18_dataset_2024_05_21_09_45_08_datumaro 1.0/images/default/08122008671.jpg"
    ),
)

a3 = dm.DatasetItem(
    id="08122008671",
    annotations=[
        Bbox(
            278.74,
            392.61,
            193.32,
            513.51,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=1,
            z_order=0,
        ),
        Bbox(
            423.73,
            87.53,
            1112.27,
            1386.48,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=0,
            z_order=0,
        ),
        Bbox(
            251.25,
            2.95,
            423.19000000000005,
            268.84000000000003,
            id=0,
            attributes={"occluded": False, "rotation": 0.0},
            group=0,
            label=2,
            z_order=0,
        ),
    ],
    media=dm.Image(
        path="/Users/vidit/Downloads/job_18_dataset_2024_05_21_09_45_08_datumaro 1.0/images/default/08122008671.jpg"
    ),
)


label1 = LabelCategories()
label1.add(
    name="human",
    parent=None,
    attributes=[],
)
label1.add(
    name="chair",
    parent=None,
    attributes=[],
)
label1.add(
    name="window",
    parent=None,
    attributes=[],
)
dataset1 = dm.Dataset.from_iterable([a1], categories={dm.AnnotationType.label: label1})

dataset2 = dm.Dataset.from_iterable([a2], categories={dm.AnnotationType.label: label1})

dataset3 = dm.Dataset.from_iterable([a3], categories={dm.AnnotationType.label: label1})

merger = IntersectMerge()
merged = merger([dataset1, dataset2, dataset3])
print(merged)
