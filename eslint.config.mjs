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

// Convert a legacy .eslintrc-style object to flat config entries and pin it to
// the files that used to be linted from that package directory.
function scopedConfig(config, files) {
    return compat.config(config).map((entry) => ({
        ...entry,
        // FlatCompat resolves plugin names itself, but some legacy configs pull
        // in plugin objects that need the manually imported/fixed versions below.
        ...(entry.plugins ? {
            plugins: Object.fromEntries(
                Object.entries(entry.plugins).map(([name, plugin]) => [name, sharedCompatPlugins[name] || plugin]),
            ),
        } : {}),
        ...(entry.ignores ? {} : { files }),
    }));
}

// Some legacy shareable configs still reference rules or plugin presets that do
// not load cleanly in the flat-config setup. Their supported rule sets are added
// explicitly later in this file.
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
                )),
            ),
            indent: 'off', // airbnb's legacy indent
        },
    };
}

// CVAT frontend packages run in browser code, Node-based tooling, and workers,
// so the shared source config starts from both browser and Node globals.
const browserAndNodeGlobals = {
    ...globals.browser,
    ...globals.node,
    ...globals.es2024,
    AbortController: 'readonly',
    WorkerGlobalScope: 'readonly',
};

// Shared plugin instances keep FlatCompat output and handwritten flat entries
// using the same plugin objects.
const sharedCompatPlugins = {
    '@stylistic': stylisticPlugin,
    '@typescript-eslint': tseslintPlugin,
    cypress: cypressPlugin,
    import: importPlugin,
    'jsx-a11y': jsxA11yPlugin,
    'no-unsanitized': noUnsanitizedPlugin,
    react: fixupPluginRules(reactPlugin),
    'react-hooks': reactHooksPlugin,
    security: securityPlugin,
    'chai-friendly': chaiFriendlyPlugin,
};

// eslint-plugin-react's jsx-filename-extension rule is not available in the
// shape required here, so the flat config carries a tiny local replacement.
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
                const [{ extensions = ['.tsx'] } = {}] = context.options;
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

// First-party application code is TypeScript today. Vendored JS and generated
// browser assets are excluded in the ignore block instead of being lint targets.
const sourceFiles = [
    'cvat-data/**/*.ts',
    'cvat-core/**/*.ts',
    'cvat-canvas/**/*.ts',
    'cvat-canvas3d/**/*.ts',
    'cvat-ui/**/*.{ts,tsx}',
];

// Cypress remains JavaScript, including the root Cypress config files.
const cypressTestFiles = [
    'tests/cypress/**/*.js',
    'tests/*cypress*.config.js',
];
const cypressPluginFiles = [
    'tests/cypress/plugins/**/*.js',
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
const testsConfig = withoutUnsupportedExtends(require('./tests/.eslintrc.js'));
const cypressBaseConfig = {
    ...testsConfig,
    rules: {
        ...(testsConfig.rules || {}),
        ...testsGlobalConfig,
    },
};

// Flat config is ordered. The entries below start with global ignores and broad
// shared rules, then layer package, TypeScript, Cypress, and mutation-specific
// overrides on top.
export default [
    {
        ignores: [
            // Repository-wide generated, vendored, and hidden paths.
            '.*/**',
            '**/node_modules/**',
            '**/dist/**',
            '**/.eslintrc.js',
            '**/.eslintrc.cjs',
            '**/lint-staged.config.js',
            '**/webpack.config.{js,cjs}',
            '3rdparty/**',
            'data/**',
            'datumaro/**',
            'keys/**',
            'logs/**',
            'static/**',
            'templates/**',
            'site/**',

            // Package-specific generated or vendored files that are still
            // matched by broad JavaScript globs.
            'cvat-ui/exec-scripts-webpack-plugin.cjs',
            'cvat-ui/src/assets/opencv*.js',
            'cvat-core/tests/**/*.cjs',
            'cvat-data/src/ts/3rdparty/**',
        ],
    },
    {
        // Security and DOM-sanitization plugins are added here because their
        // legacy shareable configs are filtered out before FlatCompat runs.
        files: [
            ...sourceFiles,
            ...cypressTestFiles,
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
            'security/detect-object-injection': 'off'
        },
    },
    // Legacy package configs are still the source of truth; FlatCompat scopes
    // each one to the package files that used to discover it via cwd.
    ...scopedConfig(rootConfig, sourceFiles),
    ...scopedConfig(dataConfig, ['cvat-data/**/*.ts']),
    ...scopedConfig(coreConfig, ['cvat-core/**/*.ts']),
    ...scopedConfig(canvasConfig, ['cvat-canvas/**/*.ts']),
    ...scopedConfig(canvas3dConfig, ['cvat-canvas3d/**/*.ts']),
    ...scopedConfig(uiConfig, ['cvat-ui/**/*.{ts,tsx}']),
    {
        // The local JSX-extension rule replaces react/jsx-filename-extension
        // after the upstream React rule set is disabled below.
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
            'local-react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
        },
    },
    {
        // TypeScript-only relaxations and replacements for rules that conflict
        // with @typescript-eslint or older CVAT generic patterns.
        files: sourceFiles,
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
            '@typescript-eslint/no-unsafe-function-type': 'error',
            'lines-between-class-members': 'off',
            '@typescript-eslint/lines-between-class-members': 'off',
            'default-param-last': 'off',
            // Relax the object type restriction - use Record<string, unknown> or explicit types where reasonable
            '@typescript-eslint/no-restricted-types': 'off',
            // Allow {} in generics (e.g., React.PureComponent<{}, State>)
            '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
        },
    },
    // Tests keep a dedicated legacy config, then receive Cypress globals and
    // plugin rules from the following flat entry.
    ...scopedConfig(cypressBaseConfig, cypressTestFiles),
    {
        files: cypressTestFiles,
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
            'cypress/no-unnecessary-waiting': 'off',
            'no-unused-expressions': 0,
            'chai-friendly/no-unused-expressions': 'error',
            'security/detect-object-injection': 'off',
        },
    },
    {
        // Cypress plugin files execute in Node but are located under the
        // Cypress tree, so they override only the environment-specific pieces.
        files: cypressPluginFiles,
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
        // Keep the stricter parameter-mutation rule centralized so package and
        // Cypress layers inherit the same allow-list.
        files: [
            ...sourceFiles,
            ...cypressTestFiles,
        ],
        rules: {
            'no-param-reassign': ['error', {
                props: true,
                ignorePropertyModificationsFor: [
                    '_label',
                    'acc',
                    'accumulator',
                    'camera',
                    'collectionObject',
                    'context',
                    'el',
                    'element',
                    'image',
                    'model',
                    'object',
                    'plugin',
                    'shape',
                    'win',
                ],
            }],
        },
    },
];
