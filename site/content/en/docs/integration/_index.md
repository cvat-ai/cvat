---
title: "Integration"
linkTitle: "Integration"
weight: 2
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
- imported and exported annotations (read docs [here]()), including CVAT own format
- backups
- serverless functions used for model launch inside CVAT
