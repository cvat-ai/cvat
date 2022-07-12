// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    ignorePatterns: [
        '.eslintrc.js',
        'webpack.config.js',
        'src/3rdparty/**',
        'node_modules/**',
        'dist/**',
    ],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
    },
    plugins: ['jest'],
};
