---
title: 'JavaScript/Typescript coding style'
linkTitle: 'JavaScript/Typescript coding style'
weight: 4
description: 'Information about JavaScript/Typescript coding style that is used in CVAT development.'
---

## Overview

We use the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for JavaScript
code with a little exception - we prefer 4 spaces for indentation of nested blocks and statements.

For Python, we use [Black](https://github.com/psf/black) and
[isort](https://pycqa.github.io/isort/) to enforce the coding style and autoformat files.
Currently, not all components implement formatting, the actual information about the enabled
components is available in the CI checks [here](https://github.com/opencv/cvat/tree/develop/.github/workflows).


## Automatic checks and formatting

It is recommended to use [git pre-commit hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
to avoid the need of manual control of linting and formatting the code. We provide a set of hooks
that can be enabled in the local development environment.

If you followed the [development environment set up instructions](../development-environment), the
hooks should be already installed automatically. They are automatically used when you run
`git commit`. Please expect that some hooks will format your code automatically.

To install hooks manually, you can run the following command:
```bash
yarn prepare
```

> The hooks are set up for the default configuration described in the installation instructions.
If you are using a custom environment setup, please check scripts in the `.husky` directory.
It is required, for instance, if your Python interpreter is installed in a non-default location.

To make a commit without running the hooks, use the `--no-verify` option: `git commit --no-verify`.
