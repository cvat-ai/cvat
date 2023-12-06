// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
    const defaultAppConfig = path.join(__dirname, 'src/config.tsx');
    const defaultPlugins = ['plugins/sam'];

    const sourceMapsDisabled = (process.env.DISABLE_SOURCE_MAPS || 'false').toLocaleLowerCase() === 'true';
    const appConfigFile = process.env.UI_APP_CONFIG ? process.env.UI_APP_CONFIG : defaultAppConfig;
    const pluginsList = process.env.CLIENT_PLUGINS ? [...defaultPlugins, ...process.env.CLIENT_PLUGINS.split(':')]
        .map((s) => s.trim()).filter((s) => !!s) : defaultPlugins;
    const sourceMapsToken = process.env.SOURCE_MAPS_TOKEN || '';

    const transformedPlugins = pluginsList
        .filter((plugin) => !!plugin).reduce((acc, _path, index) => ({
            ...acc,
            [`plugin_${index}`]: {
                dependOn: 'cvat-ui',
                // path can be absolute, in this case it is accepted as is
                // also the path can be relative to cvat-ui root directory
                import: path.isAbsolute(_path) ? _path : path.join(__dirname, _path, 'src', 'ts', 'index.tsx'),
            },
        }), {});

    console.log('Source maps: ', sourceMapsDisabled ? 'disabled' : 'enabled');
    console.log('List of plugins: ', Object.values(transformedPlugins).map((plugin) => plugin.import));

    return {
        target: 'web',
        mode: 'production',
        devtool: sourceMapsDisabled ? false : 'source-map',
        entry: {
            'cvat-ui': './src/index.tsx',
            ...transformedPlugins,
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'assets/[name].[contenthash].min.js',
            publicPath: '/',
        },
        devServer: {
            compress: false,
            host: process.env.CVAT_UI_HOST || 'localhost',
            client: {
                overlay: false,
            },
            port: 3000,
            historyApiFallback: true,
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            headers: {
                // to enable SharedArrayBuffer and ONNX multithreading
                // https://cloudblogs.microsoft.com/opensource/2021/09/02/onnx-runtime-web-running-your-machine-learning-model-in-browser/
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'credentialless',
            },
            proxy: [
                {
                    context: (param) =>
                        param.match(
                            /\/api\/.*|analytics\/.*|static\/.*|admin(?:\/(.*))?.*|profiler(?:\/(.*))?.*|documentation\/.*|django-rq(?:\/(.*))?/gm,
                        ),
                    target: env && env.API_URL,
                    secure: false,
                    changeOrigin: true,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
            fallback: {
                fs: false,
            },
            alias: {
                config$: appConfigFile,

                // when import svg modules
                // the loader transforms their to modules with JSX code
                // and adds 'import React from "react";'
                // in plugins it leads to errors because they must import '@modules/react'
                // so, this alias added to fix it
                react: '@modules/react',
                '@root': path.resolve(__dirname, 'src'),
                '@modules': path.resolve(__dirname, '..', 'node_modules'),
            },
            modules: [path.resolve(__dirname, 'src'), 'node_modules'],
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
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        [
                                            'postcss-preset-env', {},
                                        ],
                                    ],
                                },
                            },
                        },
                        'sass-loader',
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
                    test: /\.(png|jpg|jpeg|gif)$/i,
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
            new HtmlWebpackPlugin({
                template: './src/index.html',
                inject: 'body',
            }),
            new Dotenv({
                systemvars: true,
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: '../cvat-data/src/ts/3rdparty/avc.wasm',
                        to: 'assets/3rdparty/',
                    },
                    {
                        from: '../node_modules/onnxruntime-web/dist/*.wasm',
                        to  : 'assets/[name][ext]',
                    },
                    {
                        from: 'src/assets/opencv_4.8.0.js',
                        to  : 'assets/opencv_4.8.0.js',
                    },
                    {
                        from: 'plugins/**/assets/*.(onnx|js)',
                        to  : 'assets/[name][ext]',
                    }
                ],
            }),
            ...(!sourceMapsDisabled && sourceMapsToken ? [new webpack.SourceMapDevToolPlugin({
                append: '\n',
                filename: `${sourceMapsToken}/[file].map`,
            })] : []),
        ],
    }
};
