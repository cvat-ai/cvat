# cvat-ui module

## Description

This is a client UI for Computer Vision Annotation Tool based on React, Redux and Antd

## Commands

#### Migration to Yarn Modern

We have updated our Yarn version from Classic to Modern. If you are still using CVAT with Yarn 1.22.22 you need to first migrate to Yarn 4.9.x:

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

- Installing dependencies:
```bash
yarn --immutable
```

- Running development UI server with autorebuild on change

```bash
yarn run start
```

- Building the module from sources in the `dist` directory:

```bash
yarn run build
yarn run build --mode=development     # without a minification
```

Important: You also have to run CVAT server (please read `https://docs.cvat.ai/docs/contributing/`)
to correct working since UI gets all necessary data (tasks, users, annotations) from there
