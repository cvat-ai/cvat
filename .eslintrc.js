// Copyright (C) 2018-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    root: true,
    env: {
        node: true,
        browser: true,
        es6: true,
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2018,
    },
    ignorePatterns: [
        '.eslintrc.js',
        'lint-staged.config.js',
    ],
    plugins: ['security', 'no-unsanitized', 'eslint-plugin-header', 'import'],
    extends: [
        'eslint:recommended', 'plugin:security/recommended', 'plugin:no-unsanitized/DOM',
        'airbnb-base', 'plugin:import/errors', 'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    rules: {
        'header/header': [2, 'line', [{
            pattern: ' {1}Copyright \\(C\\) (?:20\\d{2}-)?2022 Intel Corporation',
            template: ' Copyright (C) 2022 Intel Corporation'
        }, '', ' SPDX-License-Identifier: MIT']],
        'no-plusplus': 0,
        'no-continue': 0,
        'no-console': 0,
        'no-param-reassign': ['error', { 'props': false }],
        'no-restricted-syntax': [0, { selector: 'ForOfStatement' }],
        'no-await-in-loop': 0,
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'max-len': ['error', { code: 120, ignoreStrings: true }],
        'func-names': 0,
        'valid-typeof': 0,
        'no-useless-constructor': 0, // sometimes constructor is necessary to generate right documentation in cvat-core
        'quotes': ['error', 'single'],
        'lines-between-class-members': 0,
        'class-methods-use-this': 0,
        'no-underscore-dangle': ['error', { allowAfterThis: true }],
        'max-classes-per-file': 0,
        'operator-linebreak': ['error', 'after'],
        'newline-per-chained-call': 0,
        'global-require': 0,
        'arrow-parens': ['error', 'always'],
        'security/detect-object-injection': 0, // the rule is relevant for user input data on the node.js environment
        'import/order': ['error', {'groups': ['builtin', 'external', 'internal']}],
        'import/prefer-default-export': 0, // works incorrect with interfaces
    },
};
