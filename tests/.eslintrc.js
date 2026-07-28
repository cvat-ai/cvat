// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const globalConfig = require('../.eslintrc.cjs');

const globalRulesWithoutTypescript = Object.fromEntries(
    Object.entries(globalConfig.rules).filter(([ruleName]) => !ruleName.startsWith('@typescript-eslint')),
);

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
    plugins: ['security', 'no-unsanitized', 'import', 'cypress'],
    extends: [
        'eslint:recommended',
        'plugin:security/recommended',
        'plugin:no-unsanitized/DOM',
        'airbnb-base',
        'plugin:import/errors',
        'plugin:import/warnings',
    ],
    rules: {
        ...globalRulesWithoutTypescript,
        'cypress/no-unnecessary-waiting': 'off',
    },
};
