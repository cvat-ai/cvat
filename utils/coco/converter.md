# Utility for converting CVAT XML annotation file to MS COCO json format

## Description

This utility gets annotation obtained from CVAT and converts to annotation in COCO representation. Input annotation must contain segmentation because bounding boxes of objects are calculated from its segments.

## Installation

Install necessary packages and create a virtual environment.

```bash
$ sudo apt-get update
$ sudo apt-get install -y --no-install-recommends python3-pip python3-venv python3-dev python3-tk libgtk-3-dev gcc
```

```
$ python3 -m venv .env
$ . .env/bin/activate
$ cat ../requirements.txt requirements.txt | xargs -n 1 -L 1 pip install
```

## Usage

Run the script inside the virtual environment.

```bash
python converter.py --cvat-xml </path/to/cvat/annotation.xml> --output </path/to/output/coco/annotation.json> --image-dir </path/to/directory/with/images> --draw </path/to/save/directory> --draw_labels --use_background_label
```

Please run `python converter.py --help` for more details.

#### Labels
The script parses input annotation and find field `labels` to find which labels are presented. If were not found any labels in annotation, script try to parse text file `labels.txt` in the same directory as annotation. This file should include labels in one string separated by spaces or one label per string and also their combinations. For example:
```
label1 label2
label3
```

