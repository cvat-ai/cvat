# Module CVAT-CORE

## Description

This CVAT module is a client-side JavaScript library for management of objects, frames, logs, etc.
It contains the core logic of the Computer Vision Annotation Tool.

### Migration to Yarn Modern

We have recently updated our Yarn version from Classic to Modern.
If you are still using CVAT with Yarn 1.22 you need to first migrate to Yarn 4.9.2:

```bash
# Remove old yarn
sudo npm uninstall -g yarn
hash -r

# Ensure corepack is installed
sudo npm install -g corepack

# Enable new yarn
corepack enable yarn
yarn --version # should show 4.9.2
```

### Commands

- Dependencies installation

```bash
yarn install --immutable
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
