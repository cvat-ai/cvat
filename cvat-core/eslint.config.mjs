// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    configDir,
    defineCoreConfig,
    defineIgnores,
} from '../eslint.config.mjs';

export default [
    ...defineIgnores([
        'webpack.config.cjs',
        'tests/**/*.cjs',
    ]),
    ...defineCoreConfig(['**/*.ts'], configDir(import.meta.url)),
];
