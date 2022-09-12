---
title: "Integration"
linkTitle: "Integration"
weight: 4
description: 'CVAT integration info'
---

## Overview

In the modern world, it is often necessary to integrate different tools to work together.
CVAT provides the following integration layers:

- Server REST API + Swagger schema
- Python client library (SDK)
  - REST API client
  - Highlevel wrappers
- Command-line tool (CLI)

In this section, you can find documentation about each separate layer.

Besides this, CVAT also has other parts that can be used by other tools. These can be:
- imported and exported annotations (read docs [here](/manual/advanced/formats)), including CVAT's own format
- backups
- serverless functions used for model launch inside CVAT

## Component compatibility

Currently, the only supported configuration is when the server API major and minor versions
are the same as SDK and CLI major and minor versions, i.e. server v2.1.* is supported by
SDK and CLI v2.1.*. Different versions may have incompatibilities, which lead to some functions
in SDK or CLI may not work properly.
