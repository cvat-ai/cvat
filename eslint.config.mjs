// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import js from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import cypressPlugin from 'eslint-plugin-cypress';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import chaiFriendlyPlugin from 'eslint-plugin-chai-friendly';

const require = createRequire(import.meta.url);
const rootDir = dirname(fileURLToPath(import.meta.url));
const reactVersion = require('./cvat-ui/package.json').dependencies.react;

const airbnbBaseConfigs = [
    require('eslint-config-airbnb-base/rules/best-practices'),
    require('eslint-config-airbnb-base/rules/errors'),
    require('eslint-config-airbnb-base/rules/node'),
    require('eslint-config-airbnb-base/rules/style'),
    require('eslint-config-airbnb-base/rules/variables'),
    require('eslint-config-airbnb-base/rules/es6'),
    require('eslint-config-airbnb-base/rules/imports'),
    require('eslint-config-airbnb-base/rules/strict'),
];
const airbnbReactConfigs = [
    require('eslint-config-airbnb/rules/react'),
    require('eslint-config-airbnb/rules/react-a11y'),
];
const airbnbReactBaseDir = dirname(require.resolve('eslint-config-airbnb'));
const airbnbReactBaseConfigs = [
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/best-practices')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/errors')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/node')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/style')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/variables')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/es6')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/imports')),
    require(join(airbnbReactBaseDir, 'node_modules/eslint-config-airbnb-base/rules/strict')),
];

function mergeRules(configs) {
    return Object.assign({}, ...configs.map((config) => config.rules || {}));
}

function mergeSettings(configs) {
    return Object.assign({}, ...configs.map((config) => config.settings || {}));
}

function packageDir(name) {
    return join(rootDir, name);
}

export function configDir(metaUrl) {
    return dirname(fileURLToPath(metaUrl));
}

const airbnbBaseRules = mergeRules(airbnbBaseConfigs);
const airbnbBaseSettings = mergeSettings(airbnbBaseConfigs);
const airbnbReactBaseRules = mergeRules(airbnbReactBaseConfigs);
const airbnbReactRules = mergeRules(airbnbReactConfigs);
const airbnbReactSettings = mergeSettings(airbnbReactConfigs);
const importRecommendedRules = mergeRules([
    importPlugin.configs.errors,
    importPlugin.configs.warnings,
    importPlugin.configs.typescript,
]);
const importJavaScriptRules = mergeRules([
    importPlugin.configs.errors,
    importPlugin.configs.warnings,
]);
const typeScriptRecommendedRules = mergeRules(tseslintPlugin.configs['flat/recommended']);

// CVAT frontend packages run in browser code, Node-based tooling, and workers,
// so the shared source config starts from both browser and Node globals.
export const browserAndNodeGlobals = {
    ...globals.browser,
    ...globals.node,
    ...globals.es2024,
    AbortController: 'readonly',
    WorkerGlobalScope: 'readonly',
};

const cypressGlobals = cypressPlugin.configs.globals.languageOptions.globals;

const testsNodeAndCypressGlobals = {
    ...browserAndNodeGlobals,
    ...cypressGlobals,
};

const sharedPlugins = {
    '@stylistic': stylisticPlugin,
    '@typescript-eslint': tseslintPlugin,
    cypress: cypressPlugin,
    import: importPlugin,
    'jsx-a11y': jsxA11yPlugin,
    'no-unsanitized': noUnsanitizedPlugin,
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
    security: securityPlugin,
    'chai-friendly': chaiFriendlyPlugin,
};

// eslint-plugin-react's jsx-filename-extension rule is not usable in the
// current ESLint 10 setup, so the flat config carries a small local replacement.
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

const commonIgnores = [
    '.*/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/eslint.config.mjs',
    '**/lint-staged.config.js',
    '**/webpack.config.{js,cjs}',
];

export function defineIgnores(ignores = []) {
    return [{
        ignores: [
            ...commonIgnores,
            ...ignores,
        ],
    }];
}

const rootRules = {
    '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
    '@stylistic/lines-between-class-members': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/default-param-last': 0,
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    '@typescript-eslint/no-empty-object-type': [
        'error',
        {
            allowInterfaces: 'always',
            allowObjectTypes: 'never',
        },
    ],
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-restricted-types': [
        'error',
        {
            types: {
                object: {
                    message: 'Use a more specific object shape, Record<string, unknown>, or unknown instead of object.',
                },
            },
        },
    ],
    '@typescript-eslint/no-unsafe-function-type': 'error',
    'arrow-parens': ['error', 'always'],
    'class-methods-use-this': 0,
    'func-names': 0,
    'function-paren-newline': 0,
    'global-require': 0,
    'import/no-unresolved': 'off',
    'import/order': ['error', { groups: ['builtin', 'external', 'internal'] }],
    'import/prefer-default-export': 0,
    indent: 'off',
    'lines-between-class-members': 'off',
    'max-classes-per-file': 0,
    'max-len': ['error', { code: 120, ignoreStrings: true }],
    'newline-per-chained-call': 0,
    'no-await-in-loop': 0,
    'no-console': 0,
    'no-continue': 0,
    'no-plusplus': 0,
    'no-restricted-syntax': [0, { selector: 'ForOfStatement' }],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'no-useless-assignment': 'off',
    'operator-linebreak': ['error', 'after'],
    'preserve-caught-error': 'off',
    quotes: ['error', 'single', { avoidEscape: true }],
    'react/jsx-indent': 0,
    'react/jsx-indent-props': 0,
    'valid-typeof': 0,
};

const airbnbCommaDangleOptions = airbnbBaseRules['comma-dangle'][1];
const stylisticTypeScriptRules = {
    // apply airbnb's rule options to stylistic's counterparts
    '@stylistic/brace-style': airbnbBaseRules['brace-style'],
    '@stylistic/comma-dangle': [
        airbnbBaseRules['comma-dangle'][0],
        {
            ...airbnbCommaDangleOptions,
            enums: airbnbCommaDangleOptions.arrays,
            generics: airbnbCommaDangleOptions.arrays,
            tuples: airbnbCommaDangleOptions.arrays,
        },
    ],
    '@stylistic/comma-spacing': airbnbBaseRules['comma-spacing'],
    '@stylistic/function-call-spacing': airbnbBaseRules['func-call-spacing'],
    '@stylistic/indent': rootRules['@stylistic/indent'],
    '@stylistic/keyword-spacing': airbnbBaseRules['keyword-spacing'],
    '@stylistic/lines-between-class-members': rootRules['@stylistic/lines-between-class-members'],
    '@stylistic/no-extra-parens': airbnbBaseRules['no-extra-parens'],
    '@stylistic/no-extra-semi': airbnbBaseRules['no-extra-semi'],
    '@stylistic/object-curly-spacing': airbnbBaseRules['object-curly-spacing'],
    '@stylistic/quotes': rootRules.quotes,
    '@stylistic/semi': airbnbBaseRules.semi,
    '@stylistic/space-before-blocks': airbnbBaseRules['space-before-blocks'],
    '@stylistic/space-before-function-paren': airbnbBaseRules['space-before-function-paren'],
    '@stylistic/space-infix-ops': airbnbBaseRules['space-infix-ops'],
    'brace-style': 'off',
    'comma-dangle': 'off',
    'comma-spacing': 'off',
    'func-call-spacing': 'off',
    indent: 'off',
    'keyword-spacing': 'off',
    'lines-between-class-members': 'off',
    'no-extra-parens': 'off',
    'no-extra-semi': 'off',
    'object-curly-spacing': 'off',
    quotes: 'off',
    semi: 'off',
    'space-before-blocks': 'off',
    'space-before-function-paren': 'off',
    'space-infix-ops': 'off',
};

// airbnb-typescript still configures removed @typescript-eslint formatting
// rules. Keep explicit silences until it ships ESLint 10/TS-ESLint 8 flat
// support. https://typescript-eslint.io/blog/deprecating-formatting-rules/
const unsupportedAirbnbTypeScriptRules = {
    '@typescript-eslint/brace-style': 'off',
    '@typescript-eslint/comma-dangle': 'off',
    '@typescript-eslint/comma-spacing': 'off',
    '@typescript-eslint/func-call-spacing': 'off',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/keyword-spacing': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    '@typescript-eslint/no-extra-parens': 'off',
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/object-curly-spacing': 'off',
    '@typescript-eslint/quotes': 'off',
    '@typescript-eslint/semi': 'off',
    '@typescript-eslint/space-before-blocks': 'off',
    '@typescript-eslint/space-before-function-paren': 'off',
    '@typescript-eslint/space-infix-ops': 'off',
};

const typeScriptOverrideRules = {
    camelcase: 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'prefer-const': ['error', { destructuring: 'any', ignoreReadBeforeAssign: true }],
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
    '@typescript-eslint/no-restricted-types': 'off',
    '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
};

const noParamReassignRules = {
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
};

const securityAndSanitizerRules = {
    // plugin:no-unsanitized/DOM is deprecated by the plugin and aliases this
    // recommended rule set. https://github.com/mozilla/eslint-plugin-no-unsanitized/blob/v4.1.5/index.js#L33-L42
    ...securityPlugin.configs['recommended-legacy'].rules,
    ...noUnsanitizedPlugin.configs['recommended-legacy'].rules,
    'security/detect-object-injection': 'off',
};

const preSharedRules = {
    ...securityAndSanitizerRules,
    'no-constant-condition': ['error', { checkLoops: 'allExceptWhileTrue' }],
};

const typeScriptBaseRules = {
    ...js.configs.recommended.rules,
    ...stylisticTypeScriptRules,
    ...importRecommendedRules,
    ...typeScriptRecommendedRules,
};

const typeScriptSettings = {
    react: {
        version: reactVersion,
    },
    ...airbnbBaseSettings,
    ...importPlugin.configs.typescript.settings,
};

const uiSettings = {
    ...importPlugin.configs.typescript.settings,
    ...airbnbBaseSettings,
    ...airbnbReactSettings,
    react: {
        ...airbnbReactSettings.react,
        version: reactVersion,
    },
};

function typeScriptLanguageOptions(tsconfigRootDir) {
    return {
        parser: tsParser,
        parserOptions: {
            ecmaFeatures: {
                globalReturn: true,
                generators: false,
                objectLiteralDuplicateProperties: false,
                jsx: true,
            },
            parser: '@typescript-eslint/parser',
            project: './tsconfig.json',
            tsconfigRootDir,
        },
        globals: {
            ...browserAndNodeGlobals,
            JSX: 'readonly',
            React: 'readonly',
        },
        sourceType: 'module',
        ecmaVersion: 2018,
    };
}

export function defineTypeScriptPackageConfig({
    files,
    tsconfigRootDir,
    rules = {},
    react = false,
}) {
    const entries = [
        {
            files,
            settings: typeScriptSettings,
            plugins: {
                ...sharedPlugins,
                'local-react': localReactPlugin,
            },
            languageOptions: typeScriptLanguageOptions(tsconfigRootDir),
            rules: preSharedRules,
        },
        {
            files,
            settings: typeScriptSettings,
            plugins: {
                ...sharedPlugins,
                'local-react': localReactPlugin,
            },
            languageOptions: typeScriptLanguageOptions(tsconfigRootDir),
            rules: typeScriptBaseRules,
        },
        {
            files,
            rules: rootRules,
        },
    ];

    if (react) {
        entries.push({
            files,
            settings: uiSettings,
            rules: {
                ...airbnbReactBaseRules,
                ...airbnbReactRules,
                indent: 'off',
                ...rootRules,
                ...rules,
            },
        });
    } else if (Object.keys(rules).length) {
        entries.push({
            files,
            rules,
        });
    }

    entries.push(
        {
            files,
            rules: {
                ...disabledReactRules,
                'local-react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
            },
        },
        {
            files,
            rules: unsupportedAirbnbTypeScriptRules,
        },
        {
            files,
            rules: stylisticTypeScriptRules,
        },
        {
            files,
            rules: typeScriptOverrideRules,
        },
        {
            files,
            rules: noParamReassignRules,
        },
    );

    return entries;
}

function importNoExtraneousDependenciesRule(packageRoot) {
    return [
        'error',
        {
            packageDir: [packageRoot, `${rootDir}/`],
        },
    ];
}

export function defineCoreConfig(files, tsconfigRootDir) {
    return defineTypeScriptPackageConfig({
        files,
        tsconfigRootDir,
        rules: {
            'import/no-extraneous-dependencies': importNoExtraneousDependenciesRule(tsconfigRootDir),
        },
    });
}

export function defineCanvasConfig(files, tsconfigRootDir) {
    return defineCoreConfig(files, tsconfigRootDir);
}

export function defineUiConfig(files, tsconfigRootDir) {
    return defineTypeScriptPackageConfig({
        files,
        tsconfigRootDir,
        react: true,
        rules: {
            'jsx-a11y/control-has-associated-label': 0,
            'react/no-unused-class-component-methods': 0,
            'react/no-unstable-nested-components': 0,
            'react/no-did-update-set-state': 0,
            'react/require-default-props': 'off',
            'react/no-unused-prop-types': 'off',
            'react/no-array-index-key': 'off',
            'react/prop-types': 'off',
            'react/jsx-props-no-spreading': 0,
            'jsx-quotes': ['error', 'prefer-single'],
            'react/static-property-placement': ['warn', 'static public field'],
            'import/no-extraneous-dependencies': importNoExtraneousDependenciesRule(tsconfigRootDir),
        },
    });
}

const testsGlobalRules = {
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
    'func-names': 0,
    quotes: ['error', 'single', { avoidEscape: true }],
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'import/order': ['error', { groups: ['builtin', 'external', 'internal'] }],
    'function-paren-newline': 0,
};

const testsBaseRules = Object.fromEntries(
    Object.entries(rootRules).filter(([ruleName]) => !ruleName.startsWith('@typescript-eslint')),
);

const cypressBaseRules = {
    ...js.configs.recommended.rules,
    ...airbnbBaseRules,
    ...importJavaScriptRules,
};

const cypressRootRules = {
    ...testsBaseRules,
    ...testsGlobalRules,
};

const cypressOverrideRules = {
    ...cypressPlugin.configs.recommended.rules,
    ...securityAndSanitizerRules,
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'no-prototype-builtins': 'off',
    'no-underscore-dangle': 'off',
    'cypress/no-unnecessary-waiting': 'off',
    'no-unused-expressions': 0,
    'chai-friendly/no-unused-expressions': 'error',
};

const cypressSettings = {
    react: {
        version: reactVersion,
    },
    ...airbnbBaseSettings,
};

export function defineCypressConfig({
    files,
    pluginFiles = [],
}) {
    return [
        {
            files,
            settings: cypressSettings,
            plugins: sharedPlugins,
            languageOptions: {
                parserOptions: {
                    parser: '@babel/eslint-parser',
                    sourceType: 'module',
                },
                globals: testsNodeAndCypressGlobals,
                sourceType: 'module',
                ecmaVersion: 'latest',
            },
            rules: preSharedRules,
        },
        {
            files,
            settings: cypressSettings,
            plugins: sharedPlugins,
            languageOptions: {
                parserOptions: {
                    parser: '@babel/eslint-parser',
                    sourceType: 'module',
                },
                globals: testsNodeAndCypressGlobals,
                sourceType: 'module',
                ecmaVersion: 'latest',
            },
            rules: cypressBaseRules,
        },
        {
            files,
            rules: cypressRootRules,
        },
        {
            files,
            rules: cypressOverrideRules,
        },
        {
            files: pluginFiles,
            settings: cypressSettings,
            plugins: sharedPlugins,
            languageOptions: {
                globals: browserAndNodeGlobals,
                sourceType: 'module',
                ecmaVersion: 'latest',
            },
            rules: {
                ...securityAndSanitizerRules,
                'import/no-unresolved': 'off',
                'import/extensions': 'off',
                'no-prototype-builtins': 'off',
                'no-underscore-dangle': 'off',
            },
        },
        {
            files,
            rules: noParamReassignRules,
        },
    ];
}

const cypressTestFiles = [
    'tests/cypress/**/*.js',
    'tests/*cypress*.config.js',
];
const cypressPluginFiles = [
    'tests/cypress/plugins/**/*.js',
];

export default [
    ...defineIgnores([
        '3rdparty/**',
        'data/**',
        'datumaro/**',
        'keys/**',
        'logs/**',
        'static/**',
        'templates/**',
        'site/**',
        'cvat-ui/exec-scripts-webpack-plugin.cjs',
        'cvat-ui/src/assets/opencv*.js',
        'cvat-core/tests/**/*.cjs',
        'cvat-data/src/ts/3rdparty/**',
    ]),
    ...defineTypeScriptPackageConfig({
        files: ['cvat-data/**/*.ts'],
        tsconfigRootDir: packageDir('cvat-data'),
    }),
    ...defineCoreConfig(['cvat-core/**/*.ts'], packageDir('cvat-core')),
    ...defineCanvasConfig(['cvat-canvas/**/*.ts'], packageDir('cvat-canvas')),
    ...defineTypeScriptPackageConfig({
        files: ['cvat-canvas3d/**/*.ts'],
        tsconfigRootDir: packageDir('cvat-canvas3d'),
    }),
    ...defineUiConfig(['cvat-ui/**/*.{ts,tsx}'], packageDir('cvat-ui')),
    ...defineCypressConfig({
        files: cypressTestFiles,
        pluginFiles: cypressPluginFiles,
    }),
];
