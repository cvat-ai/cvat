// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    configDir,
    defineIgnores,
    defineTypeScriptPackageConfig,
} from '../eslint.config.mjs';

export default [
    ...defineIgnores([
        'src/ts/3rdparty/**',
    ]),
    ...defineTypeScriptPackageConfig({
        files: ['**/*.ts'],
        tsconfigRootDir: configDir(import.meta.url),
    }),
];
