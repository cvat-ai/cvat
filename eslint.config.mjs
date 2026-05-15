// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import stylisticPlugin from '@stylistic/eslint-plugin';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import cypressPlugin from 'eslint-plugin-cypress';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import chaiFriendlyPlugin from 'eslint-plugin-chai-friendly';

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
        ...(entry.plugins ? {
            plugins: Object.fromEntries(
                Object.entries(entry.plugins).map(([name, plugin]) => [name, sharedCompatPlugins[name] || plugin]),
            ),
        } : {}),
        ...(entry.ignores ? {} : { files }),
    }));
}

function withoutUnsupportedExtends(config) {
    return {
        ...config,
        extends: (config.extends || []).filter((extend) => (
            extend !== 'plugin:security/recommended' &&
            extend !== 'plugin:no-unsanitized/DOM' &&
            extend !== 'airbnb-typescript' &&
            extend !== 'airbnb-typescript/base'
        )),
        rules: {
            ...Object.fromEntries(
            Object.entries(config.rules || {}).filter(([ruleName]) => (
                !ruleName.startsWith('security/')
            ))),
            indent: 'off', // airbnb's legacy indent
        }
    };
}

const browserAndNodeGlobals = {
    ...globals.browser,
    ...globals.node,
    ...globals.es2024,
    AbortController: 'readonly',
    WorkerGlobalScope: 'readonly',
};

const sharedCompatPlugins = {
    '@stylistic': stylisticPlugin,
    '@typescript-eslint': tseslintPlugin,
    import: importPlugin,
    'jsx-a11y': jsxA11yPlugin,
    'no-unsanitized': noUnsanitizedPlugin,
    react: fixupPluginRules(reactPlugin),
    'react-hooks': reactHooksPlugin,
    security: securityPlugin,
};
const localReactPlugin = {
    rules: {
        'jsx-filename-extension': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Restrict file extensions that may contain JSX',
                },
                schema: [{
                    type: 'object',
                    properties: {
                        extensions: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                    additionalProperties: false,
                }],
                messages: {
                    unexpectedExtension: 'JSX is only allowed in files with extensions: {{ allowed }}. Current file extension: {{ ext }}.',
                },
            },
            create(context) {
                const [{ extensions = ['.jsx', '.tsx'] } = {}] = context.options;
                let firstJSXNode = null;

                return {
                    JSXElement(node) {
                        firstJSXNode ??= node;
                    },
                    JSXFragment(node) {
                        firstJSXNode ??= node;
                    },
                    'Program:exit'() {
                        if (!firstJSXNode) {
                            return;
                        }

                        const currentExtension = extensions.find((extension) => context.filename.endsWith(extension));
                        if (currentExtension) {
                            return;
                        }

                        context.report({
                            node: firstJSXNode,
                            messageId: 'unexpectedExtension',
                            data: {
                                allowed: extensions.join(', '),
                                ext: extname(context.filename) || '(no extension)',
                            },
                        });
                    },
                };
            },
        },
    },
};
const disabledReactRules = Object.fromEntries(
    Object.keys(reactPlugin.rules).map((ruleName) => [`react/${ruleName}`, 'off']),
);

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
    'func-names': 0, // TODO: remove this, all procedures should be named
    quotes: ['error', 'single', { avoidEscape: true }],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'import/order': ['error', { groups: ['builtin', 'external', 'internal'] }],
    'function-paren-newline': 0,
};

const testsNodeAndCypressGlobals = {
    ...browserAndNodeGlobals,
    ...cypressGlobals,
};

const rootConfig = withoutUnsupportedExtends(require('./.eslintrc.cjs'));
const dataConfig = require('./cvat-data/.eslintrc.cjs');
const coreConfig = require('./cvat-core/.eslintrc.cjs');
const canvasConfig = require('./cvat-canvas/.eslintrc.cjs');
const canvas3dConfig = require('./cvat-canvas3d/.eslintrc.cjs');
const uiConfig = withoutUnsupportedExtends(require('./cvat-ui/.eslintrc.cjs'));
const testsSourceRules = Object.fromEntries(
    Object.entries(rootConfig.rules || {}).filter(([ruleName]) => !ruleName.startsWith('@typescript-eslint')),
);
const cypressBaseConfig = {
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
    },
};

export default [
    {
        ignores: [
            // Directories to ignore (migrated from .eslintignore)
            '.*/**',
            '3rdparty/**',
            'node_modules/**',
            'dist/**',
            'data/**',
            'datumaro/**',
            'keys/**',
            'logs/**',
            'static/**',
            'templates/**',
            '**/webpack.config.js',

            // Additional specific ignores
            '.eslintrc.cjs',
            'lint-staged.config.js',
            'site/**',
            'webpack.config.cjs',
            'cvat-ui/.eslintrc.cjs',
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
            'cvat-canvas/node_modules/**',
            'cvat-canvas/dist/**',
            'cvat-canvas3d/.eslintrc.cjs',
            'cvat-canvas3d/node_modules/**',
            'cvat-canvas3d/dist/**',
            'cvat-data/src/ts/3rdparty/**',
            'cvat-data/node_modules/**',
            'cvat-data/dist/**',
        ],
    },
    {
        files: [
            ...sourceFiles,
            'tests/cypress/**/*.js',
            'tests/*cypress*.config.js',
        ],
        settings: {
            react: {
                version: '18.2.0',
            },
        },
        plugins: {
            '@stylistic': stylisticPlugin,
            security: securityPlugin,
            'no-unsanitized': noUnsanitizedPlugin,
        },
        rules: {
            ...securityPlugin.configs['recommended-legacy'].rules,
            ...noUnsanitizedPlugin.configs['recommended-legacy'].rules,
            'no-constant-condition': ['error', { checkLoops: 'allExceptWhileTrue' }],
        },
    },
    ...scopedConfig(rootConfig, sourceFiles),
    ...scopedConfig(dataConfig, ['cvat-data/**/*.{js,ts}']),
    ...scopedConfig(coreConfig, ['cvat-core/**/*.{js,ts}']),
    ...scopedConfig(canvasConfig, ['cvat-canvas/**/*.{js,ts}']),
    ...scopedConfig(canvas3dConfig, ['cvat-canvas3d/**/*.{js,ts}']),
    ...scopedConfig(uiConfig, ['cvat-ui/**/*.{js,jsx,ts,tsx}']),
    {
        files: sourceFiles,
        settings: {
            react: {
                version: '18.2.0',
            },
        },
        plugins: {
            'local-react': localReactPlugin,
        },
        rules: {
            ...disabledReactRules,
            'local-react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
        },
    },
    {
        files: [
            'cvat-data/**/*.{ts,mts,cts}',
            'cvat-core/**/*.{ts,mts,cts}',
            'cvat-canvas/**/*.{ts,mts,cts}',
            'cvat-canvas3d/**/*.{ts,mts,cts}',
            'cvat-ui/**/*.{ts,tsx,mts,cts}'
        ],
        plugins: {
            react: fixupPluginRules(reactPlugin),
        },
        languageOptions: {
            globals: {
                JSX: 'readonly',
                React: 'readonly',
            },
        },
        rules: {
            camelcase: 'off',
            'import/extensions': 'off',
            'import/no-unresolved': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],
            '@typescript-eslint/default-param-last': 'off',
            'lines-between-class-members': 'off',
            '@typescript-eslint/lines-between-class-members': 'off',
            'default-param-last': 'off',
            // Relax the object type restriction - use Record<string, unknown> or explicit types where reasonable
            '@typescript-eslint/no-restricted-types': 'off',
            // Allow {} in generics (e.g., React.PureComponent<{}, State>)
            '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
        },
    },
    ...scopedConfig(cypressBaseConfig, [
        'tests/cypress/**/*.js',
        'tests/*cypress*.config.js',
    ]),
    {
        files: [
            'tests/cypress/**/*.js',
            'tests/*cypress*.config.js',
        ],
        plugins: {
            import: importPlugin,
            cypress: cypressPlugin,
            security: securityPlugin,
            'no-unsanitized': noUnsanitizedPlugin,
            'chai-friendly': chaiFriendlyPlugin,
        },
        languageOptions: {
            globals: testsNodeAndCypressGlobals,
            sourceType: 'module',
            ecmaVersion: 'latest',
        },
        rules: {
            ...cypressPlugin.configs.recommended.rules,
            ...securityPlugin.configs['recommended-legacy'].rules,
            ...noUnsanitizedPlugin.configs['recommended-legacy'].rules,
            'import/no-unresolved': 'off',
            'import/extensions': 'off',
            'no-prototype-builtins': 'off',
            'no-underscore-dangle': 'off',
            'security/detect-object-injection':'off',
            "no-unused-expressions": 0,
            "chai-friendly/no-unused-expressions": "error"
        },
    },
    ...scopedConfig(cypressBaseConfig, ['tests/cypress/plugins/**/*.js']),
    {
        files: ['tests/cypress/plugins/**/*.js'],
        plugins: {
            import: importPlugin,
            security: securityPlugin,
            'no-unsanitized': noUnsanitizedPlugin,
        },
        languageOptions: {
            globals: browserAndNodeGlobals,
            sourceType: 'module',
            ecmaVersion: 'latest',
        },
        rules: {
            ...securityPlugin.configs['recommended-legacy'].rules,
            ...noUnsanitizedPlugin.configs['recommended-legacy'].rules,
            'import/no-unresolved': 'off',
            'import/extensions': 'off',
            'no-prototype-builtins': 'off',
            'no-underscore-dangle': 'off',
        },
    },
    {
        files: [
            ...sourceFiles,
            'tests/cypress/**/*.js',
            'tests/*cypress*.config.js',
        ],
        rules: {
            'no-param-reassign': ['error', {
                props: true,
                ignorePropertyModificationsFor: [
                    '_label',
                    'acc',
                    'accumulator',
                    'arrow',
                    'attr',
                    'attrAcc',
                    'camera',
                    'circle',
                    'collectionObject',
                    'context',
                    'data',
                    'el',
                    'element',
                    'image',
                    'imageFilter',
                    'injection',
                    'instance',
                    'intersections',
                    'label',
                    'labelAccumulator',
                    'model',
                    'object',
                    'plugin',
                    'project',
                    'reqConfig',
                    'response',
                    'root',
                    'shape',
                    'shapesAccumulator',
                    'target',
                    'task',
                    'taskDataSpec',
                    'track',
                    'win',
                    'window',
                ],
            }],
        },
    },
];
