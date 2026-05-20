// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    configDir,
    defineIgnores,
    defineUiConfig,
} from '../eslint.config.mjs';

export default [
    ...defineIgnores([
        'webpack.config.js',
        'exec-scripts-webpack-plugin.cjs',
        'src/assets/opencv*.js',
    ]),
    ...defineUiConfig(['**/*.{ts,tsx}'], configDir(import.meta.url)),
];
