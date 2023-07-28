// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* global
    __dirname:true
*/

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const cvatData = {
    target: 'web',
    mode: 'production',
    entry: {
        'cvat-data': './src/ts/cvat-data.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].min.js',
        library: 'cvatData',
        libraryTarget: 'window',
    },
    resolve: {
        extensions: ['.ts', '.js'],
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
            {
                test: /\.worker\.js$/,
                exclude: /3rdparty/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/',
                        filename: '[name].[contenthash].js',
                        esModule: false,
                    },
                },
            },
            {
                test: /3rdparty\/.*\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/3rdparty/',
                        filename: '3rdparty/[name].[contenthash].js',
                        esModule: false,
                    },
                },
            },
        ],
    },
    plugins: [new CopyPlugin({ patterns: ['./src/ts/3rdparty/avc.wasm'] })],
};

module.exports = cvatData;
