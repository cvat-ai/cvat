# cvat-ui module

## Description

This is a client UI for Computer Vision Annotation Tool based on React, Redux and Antd

## Commands

- Installing dependencies:

```bash
yarn --frozen-lockfile
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
