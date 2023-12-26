// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const globalConfig = require('../.eslintrc.cjs');

module.exports = {
    root: true,
    parserOptions: {
        parser: '@babel/eslint-parser',
        sourceType: 'module',
    },
    ignorePatterns: [
        '.eslintrc.js',
        'lint-staged.config.js',
    ],
    plugins: ['security', 'no-unsanitized', 'import'],
    extends: [
        'eslint:recommended', 'plugin:security/recommended', 'plugin:no-unsanitized/DOM', 'plugin:cypress/recommended',
        'airbnb-base', 'plugin:import/errors', 'plugin:import/warnings',
    ],
    rules: {
        ...Object.fromEntries(Object.entries(globalConfig.rules).filter(([key]) => {
            return !key.startsWith('@typescript-eslint')
        })),
        "cypress/no-unnecessary-waiting": "off",
    },
};
