---
linkTitle: 'LFW'
weight: 17
---

# [LFW](http://vis-www.cs.umass.edu/lfw/)

- Format specification available [here](http://vis-www.cs.umass.edu/lfw/README.txt)

- Supported annotations: tags, points.

- Supported attributes:

  - `negative_pairs` (should be defined for labels as `text`):
    list of image names with mismatched persons.
  - `positive_pairs` (should be defined for labels as `text`):
    list of image names with matched persons.

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

# Export LFW annotation

Downloaded file: a zip archive of the following structure:

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
