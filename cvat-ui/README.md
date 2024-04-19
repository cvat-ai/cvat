# cvat-ui module

## Description

This is a client UI for Computer Vision Annotation Tool based on React, Redux and Antd

## Versioning

If you make changes in this package, please do following:

- After not important changes (typos, bug fixes, refactoring) do: `yarn version --patch`
- After adding new features do: `yarn version --minor`
- After significant UI redesign do: `yarn version --major`

Important: If you have changed versions for `cvat-core`, `cvat-canvas`, `cvat-data`,
you also need to do `yarn install` to update `package-lock.json`

## Commands

- Installing dependencies:

```bash
cd ../cvat-core && yarn --frozen-lockfile && cd - && yarn --frozen-lockfile
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

Important: You also have to run CVAT REST API server (please read `https://docs.cvat.ai/docs/contributing/`)
to correct working since UI gets all necessary data (tasks, users, annotations) from there
