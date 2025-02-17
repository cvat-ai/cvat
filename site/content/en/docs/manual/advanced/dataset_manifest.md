<!--lint disable maximum-heading-length-->

---

title: 'Dataset Manifest'
linkTitle: 'Dataset manifest'
weight: 30
description:

---

<!--lint disable heading-style-->

## Overview

When we create a new task in CVAT, we need to specify where to get the input data from.
CVAT allows to use different data sources, including local file uploads, a mounted
file share on the server, cloud storages and remote URLs. In some cases CVAT
needs to have extra information about the input data. This information can be provided
in Dataset manifest files. They are mainly used when working with cloud storages to
reduce the amount of network traffic used and speed up the task creation process.
However, they can also be used in other cases, which will be explained below.

A dataset manifest file is a text file in the JSONL format. These files can be created
automatically with [the special command-line tool](https://github.com/cvat-ai/cvat/tree/develop/utils/dataset_manifest),
or manually, following [the manifest file format specification](#file-format).

## How and when to use manifest files

Manifest files can be used in the following cases:
- A video file or a set of images is used as the data source and
  the caching mode is enabled. {{< ilink "/docs/manual/advanced/data_on_fly" "Read more" >}}
- The data is located in a cloud storage. {{< ilink "/docs/manual/basics/cloud-storages" "Read more" >}}
- The `predefined` file sorting method is specified.
  {{< ilink "/docs/manual/basics/create_an_annotation_task#sorting-method" "Read more" >}}

### The predefined sorting method

Independently of the file source being used, when the `predefined`
sorting method is selected in the task configuration, the source files will be
ordered according to the `.jsonl` manifest file, if it is found in the input list of files.
If a manifest is not found, the order provided in the input file list is used.

For image archives (e.g. `.zip`), a manifest file (`*.jsonl`) is required when using
the `predefined` file ordering. A manifest file must be provided next to the archive
in the input list of files, it must not be inside the archive.

If there are multiple manifest files in the input file list, an error will be raised.

## How to generate manifest files

CVAT provides a dedicated Python tool to generate manifest files.
The source code can be found [here](https://github.com/cvat-ai/cvat/tree/develop/utils/dataset_manifest).

Using the tool is the recommended way to create manifest files for you data. The data must be
available locally to the tool to generate manifest.

### Usage

```bash
usage: create.py [-h] [--force] [--output-dir .] source

positional arguments:
  source                Source paths

optional arguments:
  -h, --help            show this help message and exit
  --force               Use this flag to prepare the manifest file for video data
                        if by default the video does not meet the requirements
                        and a manifest file is not prepared
  --output-dir OUTPUT_DIR
                        Directory where the manifest file will be saved
```

### Use the script from a Docker image

This is the recommended way to use the tool.

The script can be used from the `cvat/server` image:

```bash
docker run -it --rm -u "$(id -u)":"$(id -g)" \
  -v "${PWD}":"/local" \
  --entrypoint python3 \
  cvat/server \
  utils/dataset_manifest/create.py --output-dir /local /local/<path/to/sources>
```

Make sure to adapt the command to your file locations.

### Use the script directly

#### Ubuntu 20.04

Install dependencies:

```bash
# General
sudo apt-get update && sudo apt-get --no-install-recommends install -y \
    python3-dev python3-pip python3-venv pkg-config
```

```bash
# Library components
sudo apt-get install --no-install-recommends -y \
    libavformat-dev libavcodec-dev libavdevice-dev \
    libavutil-dev libswscale-dev libswresample-dev libavfilter-dev
```

Create an environment and install the necessary python modules:

```bash
python3 -m venv .env
. .env/bin/activate
pip install -U pip
pip install -r utils/dataset_manifest/requirements.in
```

> Please note that if used with video this way, the results may be different from what
would the server decode. It is related to the ffmpeg library version. For this reason,
using the Docker-based version of the tool is recommended.

### Examples

Create a dataset manifest in the current directory with video which contains enough keyframes:

```bash
python utils/dataset_manifest/create.py ~/Documents/video.mp4
```

Create a dataset manifest with video which does not contain enough keyframes:

```bash
python utils/dataset_manifest/create.py --force --output-dir ~/Documents ~/Documents/video.mp4
```

Create a dataset manifest with images:

```bash
python utils/dataset_manifest/create.py --output-dir ~/Documents ~/Documents/images/
```

Create a dataset manifest with pattern (may be used `*`, `?`, `[]`):

```bash
python utils/dataset_manifest/create.py --output-dir ~/Documents "/home/${USER}/Documents/**/image*.jpeg"
```

Create a dataset manifest using Docker image:

```bash
docker run -it --rm -u "$(id -u)":"$(id -g)" \
  -v ~/Documents/data/:${HOME}/manifest/:rw \
  --entrypoint '/usr/bin/bash' \
  cvat/server \
  utils/dataset_manifest/create.py --output-dir ~/manifest/ ~/manifest/images/
```

### File format

The dataset manifest files are text files in JSONL format. These files have 2 sub-formats:
_for video_ and _for images and 3d data_.

> Each top-level entry enclosed in curly braces must use 1 string, no empty strings is allowed.
> The formatting in the descriptions below is only for demonstration.

#### Dataset manifest for video

The file describes a single video.

`pts` - time at which the frame should be shown to the user
`checksum` - `md5` hash sum for the specific image/frame decoded

```json
{ "version": <string, version id> }
{ "type": "video" }
{ "properties": {
  "name": <string, filename>,
  "resolution": [<int, width>, <int, height>],
  "length": <int, frame count>
}}
{
  "number": <int, frame number>,
  "pts": <int, frame pts>,
  "checksum": <string, md5 frame hash>
} (repeatable)
```

#### Dataset manifest for images and other data types

The file describes an ordered set of images and 3d point clouds.

`name` - file basename and leading directories from the dataset root
`checksum` - `md5` hash sum for the specific image/frame decoded

```json
{ "version": <string, version id> }
{ "type": "images" }
{
  "name": <string, image filename>,
  "extension": <string, . + file extension>,
  "width": <int, width>,
  "height": <int, height>,
  "meta": <dict, optional>,
  "checksum": <string, md5 hash, optional>
} (repeatable)
```

### Example files

#### Manifest for a video

```json
{"version":"1.0"}
{"type":"video"}
{"properties":{"name":"video.mp4","resolution":[1280,720],"length":778}}
{"number":0,"pts":0,"checksum":"17bb40d76887b56fe8213c6fded3d540"}
{"number":135,"pts":486000,"checksum":"9da9b4d42c1206d71bf17a7070a05847"}
{"number":270,"pts":972000,"checksum":"a1c3a61814f9b58b00a795fa18bb6d3e"}
{"number":405,"pts":1458000,"checksum":"18c0803b3cc1aa62ac75b112439d2b62"}
{"number":540,"pts":1944000,"checksum":"4551ecea0f80e95a6c32c32e70cac59e"}
{"number":675,"pts":2430000,"checksum":"0e72faf67e5218c70b506445ac91cdd7"}
```

#### Manifest for a dataset with images

```json
{"version":"1.0"}
{"type":"images"}
{"name":"image1","extension":".jpg","width":720,"height":405,"meta":{"related_images":[]},"checksum":"548918ec4b56132a5cff1d4acabe9947"}
{"name":"image2","extension":".jpg","width":183,"height":275,"meta":{"related_images":[]},"checksum":"4b4eefd03cc6a45c1c068b98477fb639"}
{"name":"image3","extension":".jpg","width":301,"height":167,"meta":{"related_images":[]},"checksum":"0e454a6f4a13d56c82890c98be063663"}
```
