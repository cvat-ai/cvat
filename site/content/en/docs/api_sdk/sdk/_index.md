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

SDK API includes 2 layers:
- Low-level API with REST API wrappers. Located at `cvat_sdk.api_client`. [Read more](/docs/api_sdk/sdk/lowlevel-api)
- High-level API. Located at `cvat_sdk.core`. [Read more](/docs/api_sdk/sdk/highlevel-api)

In general, the low-level API provides single-request operations, while the high-level one
implements composite, multi-request operations, and provides local proxies for server objects.
For most uses, the high-level API should be good enough, and it should be
the right point to start your integration with CVAT.

## Installation

To install an [official release of CVAT SDK](https://pypi.org/project/cvat-sdk/) use this command:
```bash
pip install cvat-sdk
```

We support Python versions 3.7 - 3.9.

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
