# Utility for converting CVAT XML annotation file to PNG masks

## Description

The utility converts CVAT XML file into separate masks for each image. Mask is a png image with one (grayscale) or several (BGR) channels where each pixel has own color which corresponds to a label.

## Installation

Install necessary packages and create a virtual environment.

```bash
$ sudo apt-get update
$ sudo apt-get install -y --no-install-recommends python3-pip python3-venv python3-dev python3-tk libgtk-3-dev
```

```
$ python3 -m venv .env
$ . .env/bin/activate
$ cat ../requirements.txt | xargs -n 1 -L 1 pip install
```

## Usage

Run the script inside the virtual environment.


```bash
$ python converter.py --cvat-xml </path/to/cvat/annotation.xml> --output-dir <output directory> --mask-bitness 24 --label-color car:255,0,0 --label-color person:0,255,0 --background-color 0,0,0
```

One more way to run the scripts with arguments is below. It is more convenient when there are a lot of labels. Arguments that are read from a file are read one argument per line.
```bash
$ cat labels.txt # an example of file with extra options
--label-color=car:255,0,0
--label-color
person:0,255,0
--background-color=0,0,0

$ python converter.py --cvat-xml </path/to/cvat/annotation.xml> --output-dir <output directory> --mask-bitness 24 @labels.txt
```

Please run `python converter.py --help` for more details.
