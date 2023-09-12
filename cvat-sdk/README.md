# SDK for [Computer Vision Annotation Tool (CVAT)](https://github.com/cvat-ai/cvat)

This package provides a Python client library for CVAT server. It can be useful for
workflow automation and writing custom CVAT server clients.

The SDK API includes several layers:

- Server API wrappers (`ApiClient`). Located in at `cvat_sdk.api_client`.
- High-level tools (`Core`). Located at `cvat_sdk.core`.
- PyTorch adapter. Located at `cvat_sdk.pytorch`.
* Auto-annotation support. Located at `cvat_sdk.auto_annotation`.

Package documentation is available [here](https://opencv.github.io/cvat/docs/api_sdk/sdk).

## Installation & Usage

To install a prebuilt package, run the following command in the terminal:

```bash
pip install cvat-sdk
```

To use the PyTorch adapter, request the `pytorch` extra:

```bash
pip install "cvat-sdk[pytorch]"
```

To install from the local directory, follow [the developer guide](https://opencv.github.io/cvat/docs/api_sdk/sdk/developer_guide).

After installation you can import the package:

```python
import cvat_sdk
```
