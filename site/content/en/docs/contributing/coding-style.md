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
You can use `dev/format_python_code.sh` to apply these formatters.
Python lines are at most 100 characters long. `black` enforces this for code,
but does not wrap comments, docstrings, and long strings: wrap them by hand.

For the principles and project agreements beyond formatting, see
[Engineering guidelines](/docs/contributing/engineering-guidelines/).
