# Computer Vision Annotation Tool (JS)

## Description
This CVAT module has been created in order to easy integration process with CVAT.

### Short development manual

- Install dependencies
```bash
npm install
```

- Build library from sources in ```dist``` directory:
```bash
npm run-script build
npm run build -- --mode=development     # without a minification
```

- Build documentation in ```docs``` directory:
```bash
npm run-script docs
```

- Run tests:
```bash
npm run-script test
```

- Update version of library:
```bash
npm version patch   # updated after minor fixes
npm version minor   # updated after major changes which don't affect API compatibility with previous versions
npm version major   # updated after major changes which affect API compatibility with previous versions
```

Visual studio code configurations:
- cvat.js debug starts debugging with entrypoint api.js
- cvat.js test builds library and runs entrypoint tests.js
