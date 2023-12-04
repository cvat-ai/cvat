// Copyright (C) 2018-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    root: true,
    env: {
        node: true,
        browser: true,
        es2020: true,
    },
    parserOptions: {
        sourceType: 'module',
        parser: '@typescript-eslint/parser',
    },
    ignorePatterns: [
        '.eslintrc.cjs',
        'lint-staged.config.js',
        'site/themes/**',
        'webpack.config.cjs',
    ],
    plugins: ['@typescript-eslint', 'security', 'no-unsanitized', 'import'],
    extends: [
        'eslint:recommended', 'plugin:security/recommended', 'plugin:no-unsanitized/DOM',
        'airbnb-base', 'plugin:import/errors', 'plugin:import/warnings',
        'plugin:import/typescript', 'plugin:@typescript-eslint/recommended', 'airbnb-typescript/base',
    ],
    rules: {
        // 'header/header': [2, 'line', [{
        //     pattern: ' {1}Copyright \\(C\\) (?:20\\d{2}-)?2022 Intel Corporation',
        //     template: ' Copyright (C) 2022 Intel Corporation'
        // }, '', ' SPDX-License-Identifier: MIT']],
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
        'quotes': ['error', 'single', { "avoidEscape": true }],
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

        'react/jsx-indent-props': 0, // new rule, breaks current styling
        'react/jsx-indent': 0, // new rule, conflicts with eslint@typescript-eslint/indent eslint@indent, breaks current styling
        'function-paren-newline': 0, // new rule, breaks current styling
        '@typescript-eslint/default-param-last': 0, // does not really work with redux reducers
        '@typescript-eslint/ban-ts-comment': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/lines-between-class-members': 0,
        '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/ban-types': [
            'error',
            {
                types: {
                    '{}': false, // TODO: try to fix with Record<string, unknown>
                    object: false, // TODO: try to fix with Record<string, unknown>
                    Function: false, // TODO: try to fix somehow
                },
            },
        ],
    },
};
