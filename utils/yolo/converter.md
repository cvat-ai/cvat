# Utility for converting CVAT XML annotation file to YOLO format

## Description

Given a CVAT XML, this script reads the CVAT XML and writes the 
annotations in YOLO format into a given directory. This implementation
supports both interpolation tracks from video and annotated images.

## Installation

Install necessary packages and create a virtual environment.

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends python3-pip python3-venv python3-dev
```

```bash
python3 -m venv .env
. .env/bin/activate
cat requirements.txt | xargs -n 1 -L 1 pip install
```

## Usage

Run the script inside the virtual environment:

```bash
python converter.py --cvat-xml </path/to/cvat/xml> --image-dir </path/to/images> --output-dir </path/to/output/directory>
```

Case you need download frames from annotated video file submited to CVAT:

```bash
python converter.py --cvat-xml </path/to/cvat/xml> --output-dir </path/to/output/directory> --username <CVAT Username> --password <CVAT Password>
```

Please run `python converter.py --help` for more details.
