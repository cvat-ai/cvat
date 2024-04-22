---
title: "API & SDK"
linkTitle: "API & SDK"
weight: 6
description: 'How to interact with CVAT'
---

## Overview

In the modern world, it is often necessary to integrate different tools to work together.
CVAT provides the following integration layers:

- Server REST API + Swagger schema
- Python client library (SDK)
  - REST API client
  - High-level wrappers
- Command-line tool (CLI)

In this section, you can find documentation about each separate layer.

## Component compatibility

Currently, the only supported configuration is when the server API major and minor versions
are the same as SDK and CLI major and minor versions, e.g. server v2.1.* is supported by
SDK and CLI v2.1.*. Different versions may have incompatibilities, which lead to some functions
in SDK or CLI may not work properly.
