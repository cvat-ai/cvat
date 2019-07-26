# Module CVAT-CORE

## Description
This CVAT module is a clien-side JavaScipt library to management of objects, frames, logs, etc.
It contains the core logic of the Computer Vision Annotation Tool.

### Commands

- Dependencies installation
```bash
npm install
```

- Building the module from sources in the ```dist``` directory:
```bash
npm run build
npm run build -- --mode=development     # without a minification
```

- Building the documentation in the ```docs``` directory:
```bash
npm run-script docs
```

- Running of tests:
```bash
npm run-script test
```

- Updating of a module version:
```bash
npm version patch   # updated after minor fixes
npm version minor   # updated after major changes which don't affect API compatibility with previous versions
npm version major   # updated after major changes which affect API compatibility with previous versions
```

Visual studio code configurations:
- cvat.js debug starts debugging with entrypoint api.js
- cvat.js test builds library and runs entrypoint tests.js
