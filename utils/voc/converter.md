# Utility for converting CVAT XML annotation file to PASCAL VOC format

## Description

Given a CVAT XML and a directory with the image dataset, this script reads the CVAT XML and writes the annotations in PASCAL VOC format into a given directory. This implementation only supports bounding boxes in CVAT annotation format, and warns if it encounter any tracks or annotations that are not bounding boxes, ignoring them in both cases.

## Installation

Install necessary packages and create a virtual environment.

```bash
$ sudo apt-get update
$ sudo apt-get install -y --no-install-recommends python3-pip python3-venv python3-dev
```

```
$ python3 -m venv .env
$ . .env/bin/activate
$ cat requirements.txt | xargs -n 1 -L 1 pip install
```

## Usage

Run the script inside the virtual environment.

```bash
$ python converter.py --cvat-xml </path/to/cvat/xml> --image-dir </path/to/images> --output-dir </path/to/output/directory>
```

Please run `python converter.py --help` for more details.
