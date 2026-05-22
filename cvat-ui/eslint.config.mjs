// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { join } from 'node:path';

import {
    configDir,
    defineIgnores,
    defineUiConfig,
} from '../eslint.config.mjs';

const currentDir = configDir(import.meta.url);

export default [
    ...defineIgnores([
        'webpack.config.js',
        'exec-scripts-webpack-plugin.cjs',
        'src/assets/opencv*.js',
    ]),
    ...defineUiConfig(['**/*.{ts,tsx}'], currentDir),
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            'import/no-extraneous-dependencies': [
                'error',
                { packageDir: [currentDir, join(currentDir, '../')] },
            ],
        },
    },
];
