// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const webConfig = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: {
        'cvat-core': './src/api.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].min.js',
        library: 'cvatCore',
        libraryTarget: 'window',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            url: false,
        },
    },
    module: {
        rules: [
            {
                test: /.ts?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-optional-chaining',
                        ],
                        presets: ['@babel/preset-env', '@babel/typescript'],
                        sourceType: 'unambiguous',
                    },
                },
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: '../cvat-data/src/ts/3rdparty/avc.wasm',
                    to: 'assets/3rdparty/',
                },
            ],
        }),
    ],
};

module.exports = webConfig;
