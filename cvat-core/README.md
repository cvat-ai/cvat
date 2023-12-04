# Module CVAT-CORE

## Description

This CVAT module is a client-side JavaScript library for management of objects, frames, logs, etc.
It contains the core logic of the Computer Vision Annotation Tool.

## Versioning

If you make changes in this package, please do following:

- After not important changes (typos, backward compatible bug fixes, refactoring) do: `yarn version --patch`
- After changing API (backward compatible new features) do: `yarn version --minor`
- After changing API (changes that break backward compatibility) do: `yarn version --major`

### Commands

- Dependencies installation

```bash
yarn install --frozen-lockfile
```

- Building the module from sources in the `dist` directory:

```bash
yarn run build
yarn run build --mode=development     # without a minification
```

- Running of tests:

```bash
yarn run test
```

- Updating of a module version:

```bash
yarn version --patch   # updated after minor fixes
yarn version --minor   # updated after major changes which don't affect API compatibility with previous versions
yarn version --major   # updated after major changes which affect API compatibility with previous versions
```

Visual studio code configurations:

- cvat.js debug starts debugging with entrypoint api.js
- cvat.js test builds library and runs entrypoint tests.js
