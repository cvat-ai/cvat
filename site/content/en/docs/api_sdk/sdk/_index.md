---
title: 'CVAT Python SDK'
linkTitle: 'SDK'
weight: 3
description: ''
---

## Overview

CVAT SDK is a Python library. It provides you access to Python functions and objects that
simplify server interaction and provide additional functionality like data validation
and serialization.

SDK API includes several layers:
- Low-level API with REST API wrappers. Located at `cvat_sdk.api_client`.
  {{< ilink "/docs/api_sdk/sdk/lowlevel-api" "Read more" >}}
- High-level API. Located at `cvat_sdk.core`.
  {{< ilink "/docs/api_sdk/sdk/highlevel-api" "Read more" >}}
- PyTorch adapter. Located at `cvat_sdk.pytorch`.
  {{< ilink "/docs/api_sdk/sdk/pytorch-adapter" "Read more" >}}
- Auto-annotation API. Located at `cvat_sdk.auto_annotation`.
  {{< ilink "/docs/api_sdk/sdk/auto-annotation" "Read more" >}}
- Miscellaneous utilities, grouped by topic.
  Located at `cvat_sdk.attributes` and `cvat_sdk.masks`.

In general, the low-level API provides single-request operations, while the high-level one
implements composite, multi-request operations, and provides local proxies for server objects.
For most uses, the high-level API should be good enough, and it should be
the right point to start your integration with CVAT.

The PyTorch adapter is a specialized layer
that represents datasets stored in CVAT as PyTorch `Dataset` objects.
This enables direct use of such datasets in PyTorch-based machine learning pipelines.

The auto-annotation API is a specialized layer
that lets you automatically annotate CVAT datasets
by running a custom function on the local machine.
See also the `auto-annotate` command in the CLI.

## Installation

To install an [official release of CVAT SDK](https://pypi.org/project/cvat-sdk/) use this command:
```bash
pip install cvat-sdk
```

To use the `cvat_sdk.masks` module, request the `masks` extra:

```bash
pip install "cvat-sdk[masks]"
```

To use the PyTorch adapter or the built-in PyTorch-based auto-annotation functions,
request the `pytorch` extra:

```bash
pip install "cvat-sdk[pytorch]"
```

To read frames of tasks whose chunks are stored as video files
(for example, through the dataset API or auto-annotation), request the `video` extra:

```bash
pip install "cvat-sdk[video]"
```

The `video` extra does not include an H.264 decoder. Download Cisco's
[OpenH264](https://github.com/cisco/openh264) library with this command:

```bash
python -m cvat_mp4_h264 install
```

The command supports Linux (x86_64 and arm64, glibc 2.27 or newer), macOS (x86_64 and arm64)
and Windows (x86_64). It stores the library in your user data directory:

| OS | Path |
|---|---|
| Linux | `~/.local/share/cvat-mp4-h264/openh264-2/libopenh264.so` |
| macOS | `~/Library/Application Support/cvat-mp4-h264/openh264-2/libopenh264.dylib` |
| Windows | `%LOCALAPPDATA%\CVAT.ai\cvat-mp4-h264\openh264-2\openh264.dll` |

`python -m cvat_mp4_h264 status` shows which library is used,
and `python -m cvat_mp4_h264 remove` deletes the downloaded copy.

OpenH264 Video Codec provided by Cisco Systems, Inc.
The library is distributed under [Cisco's binary license](https://www.openh264.org/BINARY_LICENSE.txt).

To use your own copy instead, set the `CVAT_OPENH264_LIBRARY` environment variable to its path.
It takes priority over the downloaded copy:

```bash
export CVAT_OPENH264_LIBRARY=/path/to/libopenh264.so
```

The library must be OpenH264 2.x, built for the operating system and CPU architecture
of the machine where your Python code runs.

We support Python versions 3.11 and higher.

## Usage

To import package components, use the following code:

For the high-level API:

```python
import cvat_sdk
# or
import cvat_sdk.core
```

For the low-level API:

```python
import cvat_sdk.api_client
```

For the PyTorch adapter:

```python
import cvat_sdk.pytorch
```

For complete and copy-and-run scripts see {{< ilink "/docs/api_sdk/sdk/examples" "Usage Examples" >}}.
