// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* global
    __dirname:true
*/

const path = require('path');

const nodeConfig = {
    target: 'node',
    mode: 'development',
    devtool: 'source-map',
    entry: './src/api.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-core.node.js',
        libraryTarget: 'commonjs',
    },
    module: {
        rules: [
            {
                test: /.js?$/,
                exclude: /node_modules/,
            },
        ],
    },
    stats: {
        warnings: false,
    },
};

const webConfig = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: {
        'cvat-core': './src/api.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].min.js',
        library: 'cvat',
        libraryTarget: 'window',
    },
    module: {
        rules: [
            {
                test: /.js?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        sourceType: 'unambiguous',
                    },
                },
            },
            {
                test: /3rdparty\/.*\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/static/engine/js/3rdparty/',
                        name: '[name].[contenthash].js',
                    },
                },
            },
            {
                test: /\.worker\.js$/,
                exclude: /3rdparty/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/static/engine/js/',
                        name: '[name].[contenthash].js',
                    },
                },
            },
        ],
    },
};

module.exports = [nodeConfig, webConfig];
