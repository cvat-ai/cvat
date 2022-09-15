---
title: 'Python SDK'
linkTitle: 'SDK'
weight: 3
description: ''
---

## Overview

SDK is a Python library. It provides you access to Python function and objects, which
simplify server interaction and provide additional functionality like data validation.

SDK API includes 2 layers:
- Low-level API with REST API wrappers. Located in at `cvat_sdk.api_client`. [Read more](/api_sdk/sdk/lowlevel-api)
- High-level API. Located at `cvat_sdk.core`. [Read more](/api_sdk/sdk/highlevel-api)

Roughly, low-level API provides single-request operations, while the high-level one allows you
to use composite, multi-request operations and have local counterparts for server objects.
For most uses, the high-level API should be good enough and sufficient, and it should be
right point to start your integration with CVAT.

## Installation

To install an [official release of CVAT SDK](https://pypi.org/project/cvat-sdk/) use this command:
```bash
pip install cvat-sdk
```

We support Python versions 3.7 - 3.9.

## Usage

To import the package components, use the following code:

For high-level API:

```python
import cvat_sdk
# or
import cvat_sdk.core
```

For low-level API:

```python
import cvat_sdk.api_client
```
