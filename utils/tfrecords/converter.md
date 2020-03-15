# Utility for converting CVAT XML annotation file to TFRECORDS format

## Description

Given a CVAT XML and a directory with the image dataset, this script reads the CVAT
XML and writes the annotations in tfrecords format into a given directory in addition
to the label map required for the tensorflow object detection API.

This implementation supports **annotated images only**. Make sure to dump the
**XML annotations and NOT interpolations** from CVAT.


## Installation

The conversion script depends on the tensorflow object detection API, 
for installation steps.

### 1. Install necessary packages (including tensorflow).

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends python3-pip python3-dev
```

``` bash
python3 -m pip install -r requirements.txt
```

### 2. Install the tensorflow object detection API
 If it's already installed you can check your `$PYTHONPATH`and move on to the usage section. 
 Here's a quick (unofficial) guide on how to do that.
 For more details follow the official guide
 [INSTALL TENSORFLOW OBJECT DETECTION API](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/installation.md).
 
```bash
# clone the models repository
git clone https://github.com/tensorflow/models.git
```
```bash
# install some dependencies
python3 -m pip install --user Cython
python3 -m pip install --user contextlib2
python3 -m pip install --user pillow
python3 -m pip install --user lxml
python3 -m pip install --user jupyter
python3 -m pip install --user matplotlib
```
```bash
# clone and compile the cocoapi
git clone https://github.com/cocodataset/cocoapi.git
cd cocoapi/PythonAPI
make
cp -r pycocotools <path_to_models_repo>/models/research/
```
```bash
# Protobuf Compilation
cd <path_to_models_repo>/models/research/
protoc object_detection/protos/*.proto --python_out=.
```
```bash
# setup the PYTHONPATH
export PYTHONPATH=$PYTHONPATH:`pwd`:`pwd`/slim
 ```

## Usage

Run the script.

```bash
$python3 converter.py --cvat-xml </path/to/cvat/xml> --image-dir </path/to/images>\
  --output-dir </path/to/output/directory> --attribute <attribute>
```

Leave `--attribute` argument empty if you want the to consider CVAT labels as tfrecords labels,
otherwise you can specify a used attribute name like `--attribute <attribute>`.

Please run `python converter.py --help` for more details.
