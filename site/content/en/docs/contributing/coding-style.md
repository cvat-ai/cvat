---
title: 'Coding style'
linkTitle: 'Coding style'
weight: 4
description: 'Information about coding style that is used in CVAT development.'
---

We use the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
for JavaScript/TypeScript code with a little exception - we prefer 4 spaces
for indentation of nested blocks and statements.

For Python, we use [Black](https://github.com/psf/black) and
[isort](https://pycqa.github.io/isort/) to enforce the coding style and autoformat files.
Currently, not all components implement formatting, the actual information about the enabled
components is available in the CI checks [here](https://github.com/cvat-ai/cvat/tree/develop/.github/workflows)
and in the formatting script at `dev/format_python_code.sh`.
