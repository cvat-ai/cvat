// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module',
        ecmaVersion: 2018,
    },
    ignorePatterns: ['.eslintrc.js', 'webpack.config.js', 'src/3rdparty/**', 'node_modules/**', 'dist/**'],
};
