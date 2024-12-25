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
- Auto-annotation API. Located at `cvat_sdk.auto_annotation.`
  {{< ilink "/docs/api_sdk/sdk/auto-annotation" "Read more" >}}

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

We support Python versions 3.9 and higher.

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
