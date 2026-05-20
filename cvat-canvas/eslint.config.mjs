// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    configDir,
    defineCanvasConfig,
    defineIgnores,
} from '../eslint.config.mjs';

export default [
    ...defineIgnores([
        'webpack.config.js',
    ]),
    ...defineCanvasConfig(['**/*.ts'], configDir(import.meta.url)),
];
