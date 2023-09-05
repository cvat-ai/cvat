// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const globalConfig = require('../.eslintrc.js');
const { join } = require('path');

module.exports = {
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'src/assets/opencv_4.5.4_dev.js',
        'node_modules/**',
        'dist/**',
    ],
    extends: ['airbnb-typescript'],
    rules: {
        ...globalConfig.rules, // need to import rules again because they've been redefined by "airbnb-typescript"

        'react/no-did-update-set-state': 0, // https://github.com/airbnb/javascript/issues/1875
        'react/require-default-props': 'off',
        'react/no-unused-prop-types': 'off',
        'react/no-array-index-key': 'off',
        'react/static-property-placement': ['error', 'static public field'],
        'react/jsx-indent': ['warn', 4],
        'react/jsx-indent-props': ['warn', 4],
        'react/jsx-props-no-spreading': 0,
        'jsx-quotes': ['error', 'prefer-single'],
        'import/no-extraneous-dependencies': [
            'error',
            {
                packageDir: [__dirname, join(__dirname, '../')]
            },
        ],
    },
};
