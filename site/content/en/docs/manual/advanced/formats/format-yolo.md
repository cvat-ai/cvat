---
title: 'YOLO'
linkTitle: 'YOLO'
weight: 7
description: 'How to export and import data in YOLO format'
---

YOLO, which stands for "You Only Look Once," is a renowned framework
predominantly utilized for real-time object detection tasks.
Its efficiency and speed make it an ideal choice for many applications.
While YOLO has its unique data format,
this format can be tailored to suit other object detection models as well.

For more information, see:

- [YOLO Specification](https://pjreddie.com/darknet/yolo/)
- [Format specification](https://github.com/AlexeyAB/darknet#how-to-train-to-detect-your-custom-objects)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/yolo_dataset)

## YOLO export

For export of images:

- Supported annotations: Bounding Boxes.
- Attributes: Not supported.
- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
archive.zip/
├── obj.data
├── obj.names
├── obj_<subset>_data
│   ├── image1.txt
│   └── image2.txt
└── train.txt # list of subset image paths

# the only valid subsets are: train, valid
# train.txt and valid.txt:
obj_<subset>_data/image1.jpg
obj_<subset>_data/image2.jpg

# obj.data:
classes = 3 # optional
names = obj.names
train = train.txt
valid = valid.txt # optional
backup = backup/ # optional

# obj.names:
cat
dog
airplane

# image_name.txt:
# label_id - id from obj.names
# cx, cy - relative coordinates of the bbox center
# rw, rh - relative size of the bbox
# label_id cx cy rw rh
1 0.3 0.8 0.1 0.3
2 0.7 0.2 0.3 0.1
```

Each annotation file, with the `.txt` extension,
is named to correspond with its associated image file.

For example, `frame_000001.txt` serves as the annotation for the
`frame_000001.jpg` image.

The structure of the `.txt` file is as follows:
each line describes a label and a bounding box
in the format `label_id cx cy w h`.
The file `obj.names` contains an ordered list of label names.

## YOLO import

Uploaded file: a zip archive of the same structure as above
It must be possible to match the CVAT frame (image name)
and annotation file name. There are 2 options:

1. full match between image name and name of annotation `*.txt` file
   (in cases when a task was created from images or archive of images).

1. match by frame number (if CVAT cannot match by name). File name
   should be in the following format `<number>.jpg` .
   It should be used when task was created from a video.

## How to create a task from YOLO formatted dataset (from VOC for example)

1. Follow the official [guide](https://pjreddie.com/darknet/yolo/) (see Training YOLO on VOC section)
   and prepare the YOLO formatted annotation files.

1. Zip train images

   ```bash
   zip images.zip -j -@ < train.txt
   ```

1. Create a CVAT task with the following labels:

   ```bash
   aeroplane bicycle bird boat bottle bus car cat chair cow diningtable dog
   horse motorbike person pottedplant sheep sofa train tvmonitor
   ```

   Select images. zip as data. Most likely you should use `share`
   functionality because size of images. zip is more than 500Mb.
   See {{< ilink "/docs/manual/basics/create_an_annotation_task" "Creating an annotation task" >}}
   guide for details.

1. Create `obj.names` with the following content:

   ```bash
   aeroplane
   bicycle
   bird
   boat
   bottle
   bus
   car
   cat
   chair
   cow
   diningtable
   dog
   horse
   motorbike
   person
   pottedplant
   sheep
   sofa
   train
   tvmonitor
   ```

1. Zip all label files together (we need to add only label files that correspond to the train subset):

   ```bash
   cat train.txt | while read p; do echo ${p%/*/*}/labels/${${p##*/}%%.*}.txt; done | zip labels.zip -j -@ obj.names
   ```

1. Click `Upload annotation` button, choose `YOLO 1.1` and select the zip
   file with labels from the previous step.
