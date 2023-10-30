---
title: 'LFW'
linkTitle: 'LFW'
weight: 17
description: 'How to export and import data in LFW format'
---

The Labeled Faces in the Wild (LFW) format
is primarily used for face verification and face recognition tasks.
The LFW format is designed to be straightforward and
is compatible with a variety of machine learning and deep learning frameworks.

For more information, see:

- [LFW site](http://vis-www.cs.umass.edu/lfw/)
- [Format specification](http://vis-www.cs.umass.edu/lfw/README.txt)
- [Dataset examples](https://github.com/cvat-ai/datumaro/tree/v0.3/tests/assets/lfw_dataset)

# Export LFW annotation

For export of images:

- Supported annotations: Tags, Skeletons.
- Attributes:

  - `negative_pairs` (should be defined for labels as `text`):
    list of image names with mismatched persons.
  - `positive_pairs` (should be defined for labels as `text`):
    list of image names with matched persons.

- Tracks: Not supported.

The downloaded file is a .zip archive with the following structure:

```bash
<archive_name>.zip/
    └── images/ # if the option save images was selected
    │    ├── name1/
    │    │   ├── name1_0001.jpg
    │    │   ├── name1_0002.jpg
    │    │   ├── ...
    │    ├── name2/
    │    │   ├── name2_0001.jpg
    │    │   ├── name2_0002.jpg
    │    │   ├── ...
    │    ├── ...
    ├── landmarks.txt
    ├── pairs.txt
    └── people.txt
```

# Import LFW annotation

The uploaded annotations file should be a zip file with the following structure:

```bash
<archive_name>.zip/
    └── annotations/
        ├── landmarks.txt # list with landmark points for each image
        ├── pairs.txt # list of matched and mismatched pairs of person
        └── people.txt # optional file with a list of persons name
```

Full information about the content of annotation files is available
[here](http://vis-www.cs.umass.edu/lfw/README.txt)

# Example: create task with images and upload LFW annotations into it

This is one of the possible ways to create a task and add LFW annotations for it.

- On the task creation page:
  - Add labels that correspond to the names of the persons.
  - For each label define `text` attributes with names `positive_pairs` and
    `negative_pairs`
  - Add images using zip archive from local repository:

```bash
images.zip/
    ├── name1_0001.jpg
    ├── name1_0002.jpg
    ├── ...
    ├── name1_<N>.jpg
    ├── name2_0001.jpg
    ├── ...
```

- On the annotation page:
  Upload annotation -> LFW 1.0 -> choose archive with structure
  that described in the [import section](#import-lfw-annotation).
