// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');
const ExecScriptsPlugin = require('./exec-scripts-webpack-plugin.cjs');
const {
    CSPWorkerViolationBootstrapPlugin,
    CSPViolationBootstrapPlugin,
    cspHeadersGetterFactory,
    getCSPMode,
} = require('../csp/webpack-helpers.cjs');

const PROXIED_PATH_REGEXP = /^(?:\/api\/|\/analytics\/|\/static\/|\/admin(?:\/|$)|\/profiler(?:\/|$)|\/documentation\/|\/django-rq(?:\/|$))/;

function isProxiedPath(pathname) {
    return PROXIED_PATH_REGEXP.test(pathname);
}

module.exports = (env, argv = {}) => {
    const isDevMode = argv.mode === 'development' || process.env.WEBPACK_SERVE === 'true';
    const sourceMapsEnabled = isDevMode ||
        (process.env.SOURCE_MAPS_ENABLED || 'false').toLocaleLowerCase() === 'true';

    const defaultPlugins = ['plugins/sam'];
    const plugins = process.env.CLIENT_PLUGINS ? [...defaultPlugins, ...process.env.CLIENT_PLUGINS.split(':')]
        .map((plugin) => plugin.trim()).filter((plugin) => !!plugin) : defaultPlugins;

    const pluginPaths = plugins.map((pluginPath) => {
        const abs = path.isAbsolute(pluginPath) ? pluginPath : path.join(__dirname, pluginPath);
        const prepareScript = path.join(abs, 'prepare.cjs');
        return {
            cwd: abs,
            entrypoint: path.join(abs, 'src', 'ts', 'index.tsx'),
            script: fs.existsSync(prepareScript) ? prepareScript : null,
        };
    }).filter(({ entrypoint }) => {
        if (!fs.existsSync(entrypoint)) {
            console.warn(`Not found entrypoint ${entrypoint}. The plugin skipped.`);
            return false;
        }
        return true;
    });

    console.log('Source maps: ', sourceMapsEnabled ? 'enabled' : 'disabled');
    console.log('Plugins:');
    for (const { entrypoint } of pluginPaths) {
        console.log(`- ${entrypoint}`);
    }

    const host = process.env.CVAT_UI_HOST ?? 'localhost';
    const port = process.env.CVAT_UI_PORT ?? 3000;
    const cspMode = getCSPMode(isDevMode, env?.CVAT_UI_CSP_MODE);
    console.log('CSP checking: ', cspMode);
    const getCspHeaders = cspHeadersGetterFactory(cspMode, isProxiedPath);
    return {
        target: 'web',
        mode: isDevMode ? 'development' : 'production',
        devtool: sourceMapsEnabled ? (isDevMode ? 'source-map' : 'hidden-source-map') : false,
        watchOptions: isDevMode ? {
            ignored: [
                '**/node_modules/**',
                '**/src/utils/csp/csp-violation-bootstrap.ts',
                '**/src/utils/csp/csp-violation-observer.ts',
            ],
        } : {},
        entry: {
            ...(isDevMode ? {
                'csp-violation-bootstrap': './src/utils/csp/csp-violation-bootstrap.ts',
            } : {}),
            'cvat-ui': isDevMode ? {
                dependOn: 'csp-violation-bootstrap',
                import: './src/index.tsx',
            } : './src/index.tsx',
            ...pluginPaths.reduce((acc, { entrypoint }, index) => ({
                ...acc,
                [`plugin_${index}`]: {
                    dependOn: 'cvat-ui',
                    // path can be absolute, in this case it is accepted as is
                    // also the path can be relative to cvat-ui root directory
                    import: entrypoint,
                },
            }), {})
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'assets/[name].[contenthash].min.js',
            workerChunkFilename: 'assets/[name].[contenthash].min.js',
            publicPath: '/',
        },
        devServer: {
            host,
            port,
            compress: false,
            client: {
                overlay: false,
                webSocketURL: 'ws://0.0.0.0:0/ws',
            },
            historyApiFallback: true,
            static: {
                directory: path.join(__dirname, 'dist'),
                watch: false,
            },
            headers: (request) => ({
                // to enable SharedArrayBuffer and ONNX multithreading
                // https://cloudblogs.microsoft.com/opensource/2021/09/02/onnx-runtime-web-running-your-machine-learning-model-in-browser/
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'credentialless',
                'Service-Worker-Allowed': '/',
                ...getCspHeaders(request),
            }),
            proxy: [{
                context: isProxiedPath,
                target: env && env.API_URL,
                secure: false,
                changeOrigin: true,
                onProxyReq: (proxyReq) => {
                    // Traefik uses the upstream Host to populate X-Forwarded-Host.
                    // Keep it equal to the browser-facing dev server so generated
                    // TUS upload locations are proxied through this server as well.
                    proxyReq.setHeader('Host', `${host}:${port}`);
                    proxyReq.setHeader('X-FORWARDED-HOST', `${host}:${port}`);
                },
            }],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
            fallback: {
                fs: false,
            },
            alias: {
                // when import svg modules
                // the loader transforms their to modules with JSX code
                // and adds 'import React from "react";'
                // in plugins it leads to errors because they must import '@modules/react'
                // so, this alias added to fix it
                react: '@modules/react',
                '@root': path.resolve(__dirname, 'src'),
                '@modules': path.resolve(__dirname, '..', 'node_modules'),
            },
            modules: [
                path.resolve(__dirname, 'src'),
                'node_modules',
                // Fallback for plugins symlinked from outside the CVAT source tree. Keep this after
                // 'node_modules' to preserve standard resolution of nested package dependencies.
                path.resolve(__dirname, '..', 'node_modules'),
            ],
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            plugins: [
                                '@babel/plugin-proposal-class-properties',
                                '@babel/plugin-proposal-optional-chaining',
                                '@babel/plugin-transform-private-methods',
                                [
                                    'import',
                                    {
                                        libraryName: 'antd',
                                    },
                                ],
                            ],
                            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/typescript'],
                            sourceType: 'unambiguous',
                        },
                    },
                },
                {
                    test: /\.(css|scss)$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 2,
                                sourceMap: false,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: false,
                                postcssOptions: {
                                    plugins: [
                                        [
                                            'postcss-preset-env', {},
                                        ],
                                    ],
                                },
                            },
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: false,
                            },
                        },
                    ],
                },
                {
                    test: /\.svg$/,
                    exclude: /node_modules/,
                    use: [
                        'babel-loader',
                        {
                            loader: 'react-svg-loader',
                            options: {
                                svgo: {
                                    plugins: [{ pretty: true }, { cleanupIDs: false }],
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(png|jpg|jpeg|gif|webp)$/i,
                    type: 'asset/resource',
                },
            ],
            parser: {
                javascript: {
                    exportsPresence: 'error',
                },
            },
        },
        plugins: [
            new ExecScriptsPlugin(pluginPaths.filter(({ script }) => !!script)),
            new HtmlWebpackPlugin({
                template: './src/index.html',
                inject: 'body',
                ...(isDevMode ? {
                    excludeChunks: ['csp-violation-bootstrap'],
                } : {}),
            }),
            ...(isDevMode ? [new CSPViolationBootstrapPlugin()] : []),
            ...(isDevMode ? [new CSPWorkerViolationBootstrapPlugin(
                /^workers\//,
            )] : []),
            new Dotenv({
                systemvars: true,
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: '../node_modules/onnxruntime-web/dist/*.wasm',
                        to  : 'assets/[name][ext]',
                    },
                    {
                        from: '../node_modules/onnxruntime-web/dist/*.mjs',
                        to: 'assets/[name][ext]',
                    },
                    {
                        from: 'src/assets/opencv_4.8.0.js',
                        to  : 'assets/opencv_4.8.0.js',
                    },
                    {
                        from: 'src/assets/*.{png,webp}',
                        to  : 'assets/[name][ext]',
                    },
                    {
                        from: 'plugins/**/assets/*.(onnx|js|png)',
                        to  : 'assets/[name][ext]',
                    },
                ],
            }),
        ],
    }
};
