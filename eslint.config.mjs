// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import cypressPlugin from 'eslint-plugin-cypress';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

function scopedConfig(config, files) {
    return compat.config(config).map((entry) => ({
        ...entry,
        ...(entry.ignores ? {} : { files }),
    }));
}

function withoutUnsupportedExtends(config) {
    const unsupportedRules = new Set([
        '@typescript-eslint/ban-types',
        '@typescript-eslint/indent',
        '@typescript-eslint/lines-between-class-members',
    ]);

    return {
        ...config,
        extends: (config.extends || []).filter((extend) => (
            extend !== 'plugin:security/recommended' &&
            extend !== 'plugin:no-unsanitized/DOM' &&
            extend !== 'airbnb-typescript' &&
            extend !== 'airbnb-typescript/base'
        )),
        rules: Object.fromEntries(
            Object.entries(config.rules || {}).filter(([ruleName]) => (
                !unsupportedRules.has(ruleName) &&
                !ruleName.startsWith('security/')
            )),
        ),
    };
}

const browserAndNodeGlobals = {
    ...globals.browser,
    ...globals.node,
    ...globals.es2024,
    AbortController: 'readonly',
    WorkerGlobalScope: 'readonly',
};

const sourceFiles = [
    'cvat-data/**/*.{js,ts}',
    'cvat-core/**/*.{js,ts}',
    'cvat-canvas/**/*.{js,ts}',
    'cvat-canvas3d/**/*.{js,ts}',
    'cvat-ui/**/*.{js,jsx,ts,tsx}',
];

const cypressGlobals = {
    Cypress: 'readonly',
    cy: 'readonly',
    expect: 'readonly',
    assert: 'readonly',
    before: 'readonly',
    after: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    context: 'readonly',
    describe: 'readonly',
    it: 'readonly',
};

const testsGlobalConfig = {
    camelcase: ['error', { properties: 'never', ignoreDestructuring: false, ignoreImports: false }],
    'no-continue': 0,
    'no-console': 0,
    'no-param-reassign': ['error', { props: false }],
    'no-restricted-syntax': [
        'error',
        {
            selector: 'VariableDeclarator > Identifier[name=/[a-z]ID/]',
            message: 'Use "Id" instead of "ID" in test variable names.',
        },
        {
            selector: ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) > Identifier[name=/[a-z]ID/]',
            message: 'Use "Id" instead of "ID" in test function and parameter names.',
        },
        {
            selector: ':matches(ImportSpecifier, ImportDefaultSpecifier, ImportNamespaceSpecifier)[local.name=/[a-z]ID/]',
            message: 'Use "Id" instead of "ID" in imported local names.',
        },
    ],
    'func-names': 0,
    quotes: ['error', 'single', { avoidEscape: true }],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'import/order': ['error', { groups: ['builtin', 'external', 'internal'] }],
    'function-paren-newline': 0,
};

const testsNodeAndCypressGlobals = {
    ...browserAndNodeGlobals,
    ...cypressGlobals,
};
const cypressFiles = [
    'tests/cypress/**/*.js',
    'tests/*cypress*.config.js',
    'tests/nightly_cypress.config.js',
];

const rootConfig = withoutUnsupportedExtends(require('./.eslintrc.cjs'));
const dataConfig = require('./cvat-data/.eslintrc.cjs');
const coreConfig = require('./cvat-core/.eslintrc.cjs');
const canvasConfig = require('./cvat-canvas/.eslintrc.cjs');
const canvas3dConfig = require('./cvat-canvas3d/.eslintrc.cjs');
const uiConfig = withoutUnsupportedExtends(require('./cvat-ui/.eslintrc.cjs'));
const testsSourceRules = Object.fromEntries(
    Object.entries(rootConfig.rules || {}).filter(([ruleName]) => !ruleName.startsWith('@typescript-eslint')),
);
const testsBaseConfig = {
    parserOptions: {
        parser: '@babel/eslint-parser',
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
        'airbnb-base',
        'plugin:import/errors',
        'plugin:import/warnings',
    ],
    rules: {
        ...testsSourceRules,
        ...testsGlobalConfig,
        'cypress/no-unnecessary-waiting': 'off',
    },
};

export default [
    {
        ignores: [
            '.eslintrc.cjs',
            'lint-staged.config.js',
            'site/**',
            'webpack.config.cjs',
            'cvat-ui/.eslintrc.cjs',
            'cvat-ui/webpack.config.js',
            'cvat-ui/exec-scripts-webpack-plugin.cjs',
            'cvat-ui/src/assets/opencv*.js',
            'cvat-ui/node_modules/**',
            'cvat-ui/dist/**',
            'cvat-core/.eslintrc.cjs',
            'cvat-core/webpack.config.cjs',
            'cvat-core/node_modules/**',
            'cvat-core/dist/**',
            'cvat-core/tests/**/*.cjs',
            'cvat-canvas/.eslintrc.cjs',
            'cvat-canvas/webpack.config.js',
            'cvat-canvas/node_modules/**',
            'cvat-canvas/dist/**',
            'cvat-canvas3d/.eslintrc.cjs',
            'cvat-canvas3d/webpack.config.js',
            'cvat-canvas3d/node_modules/**',
            'cvat-canvas3d/dist/**',
            'cvat-data/src/ts/3rdparty/**',
            'cvat-data/node_modules/**',
            'cvat-data/dist/**',
            'node_modules/**',
        ],
    },
    ...scopedConfig(rootConfig, sourceFiles),
    ...scopedConfig(dataConfig, ['cvat-data/**/*.{js,ts}']),
    ...scopedConfig(coreConfig, ['cvat-core/**/*.{js,ts}']),
    ...scopedConfig(canvasConfig, ['cvat-canvas/**/*.{js,ts}']),
    ...scopedConfig(canvas3dConfig, ['cvat-canvas3d/**/*.{js,ts}']),
    ...scopedConfig(uiConfig, ['cvat-ui/**/*.{js,jsx,ts,tsx}']),
    {
        files: [
            'cvat-data/**/*.{ts,mts,cts}',
            'cvat-core/**/*.{ts,mts,cts}',
            'cvat-canvas/**/*.{ts,mts,cts}',
            'cvat-canvas3d/**/*.{ts,mts,cts}',
            'cvat-ui/**/*.{ts,tsx,mts,cts}'
        ],
        rules: {
            camelcase: 'off',
            'import/extensions': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },
    ...scopedConfig(testsBaseConfig, cypressFiles),
    ...scopedConfig(securityPlugin.configs['recommended-legacy'], cypressFiles),
    ...scopedConfig(noUnsanitizedPlugin.configs['recommended-legacy'], cypressFiles),
    {
        ...cypressPlugin.configs.recommended,
        files: cypressFiles,
        languageOptions: {
            ...cypressPlugin.configs.recommended.languageOptions,
            globals: {
                ...(cypressPlugin.configs.recommended.languageOptions?.globals || {}),
                ...testsNodeAndCypressGlobals,
            },
        },
    },
    {
        files: cypressFiles,
        languageOptions: {
            globals: testsNodeAndCypressGlobals,
        },
        rules: {
            'cypress/no-unnecessary-waiting': 'off',
        },
    },
];
