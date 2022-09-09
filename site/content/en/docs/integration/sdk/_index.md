---
title: 'Python SDK'
linkTitle: 'SDK'
weight: 1
description: 'Python SDK documentation'
---

## Overview

SDK is a Python library. It provides you access to

SDK API includes 2 layers:
- Low-level API with REST API wrappers. Located in at `cvat_sdk.api_client`. [Read more](/integration/sdk/lowlevel-api)
- High-level API. Located at `cvat_sdk.core`. [Read more](/integration/sdk/highlevel-api)

## Installation

You can install the official release from PyPI with the following command:
```bash
pip install cvat-sdk
```

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
