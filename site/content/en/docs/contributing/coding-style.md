---
title: 'JavaScript/Typescript coding style'
linkTitle: 'JavaScript/Typescript coding style'
weight: 4
description: 'Information about JavaScript/Typescript coding style that is used in CVAT development.'
---

## Overview

We use the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for JavaScript code with a
little exception - we prefer 4 spaces for indentation of nested blocks and statements.

For Python, we use [Black](https://github.com/psf/black) and [isort](https://pycqa.github.io/isort/) to enforce the coding style and autoformat files.
Currently, not all components implement formatting.


## Hooks

It is recommended to use [git pre-commit hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
to avoid the need of manual control of linting and formatting the code. We provide a set of hooks
that can be enabled in the local development environment.

If you followed the [development environment set up instructions](../development-environment), the
hooks should be already installed automatically. They are automatically used when you run
`git commit`.

To install hooks manually, you can run the following commands:
```bash
npx husky install
```

If you don't want to use `husky`, you can enable hooks with this command:
```bash
git config --local core.hooksPath ".husky"
```

To make a commit without running the hooks, use the `--no-verify` option: `git commit --no-verify`.
