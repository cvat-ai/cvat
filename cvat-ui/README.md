# cvat-ui module

## Description

This is a client UI for Computer Vision Annotation Tool based on React, Redux and Antd

## Versioning

If you make changes in this package, please do following:

- After not important changes (typos, bug fixes, refactoring) do: `npm version patch`
- After adding new features do: `npm version minor`
- After significant UI redesign do: `npm version major`

Important: If you have changed versions for `cvat-core`, `cvat-canvas`, `cvat-data`,
you also need to do `npm install` to update `package-lock.json`

## Commands

- Installing dependencies:

```bash
cd ../cvat-core && npm ci && cd - && npm ci
```

- Running development UI server with autorebuild on change

```bash
npm start
```

- Building the module from sources in the `dist` directory:

```bash
npm run build
npm run build -- --mode=development     # without a minification
```

Important: You also have to run CVAT REST API server (please read `CONTRIBUTING.md`)
to correct working since UI gets all necessary data (tasks, users, annotations) from there
