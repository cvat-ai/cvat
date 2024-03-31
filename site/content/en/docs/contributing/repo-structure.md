---
title: 'Repository structure'
linkTitle: 'Repository structure'
weight: 12
description: 'How to find the components needed'
---

CVAT stores all its components is a single ("monolithic") repository.
An explanation of CVAT components is available [here](https://youtu.be/CGOBR5ZmIC0?t=237).

Here is the list of the main directories and files in the repository:

- `./` - Various common files for the repository
- `.github/` - GitHub configuration files
- `.vscode/` - VS Code configuration files
- `components/` - optional server services
- `cvat/` - server source code
  - `apps/` - server modules sources
  - `requirements/` - server Python package requirements
  - `settings/` - server configurations
- `cvat-canvas/` - UI package, responsible for the annotation canvas
- `cvat-canvas3d/` - UI package, responsible for the annotation canvas for 3D
- `cvat-cli/` - CLI utility
- `cvat-core/` - UI package, responsible for server interaction
- `cvat-data/` - UI package, responsible for media data decoding
- `cvat-sdk/` - Python SDK package
- `cvat-ui/` - UI package, responsible for UI elements
- `helm-chart/` - Helm configuration for deployment on Kubernetes
- `serverless/` - AI models
- `site/` - Documentation website sources
  - `assets/` - Media content
  - `content/` - Documentation pages
- `supervisord/` - supervisord deployment configuration
- `tests/` - End-to-end tests
  - `cypress/` - UI end-to-end tests
  - `python/` - Tests for server, SDK, CLI and other Python components
- `utils/` - Additional tools and utility scripts
  - `dataset_manifest/` - Python library and a tool to create dataset manifest files
  - `dicom_converter/` - Script to convert DICOM data to CVAT-compatible format
- `docker-compose*.yml` - Docker Compose local deployment configuration
- `Dockerfile*` - Docker image descriptions
- `manage.py` - Django utility to manipulate server components
