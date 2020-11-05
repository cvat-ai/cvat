// Copyright (C) 2020 Intel Corporation
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
        'cvat-data': './src/js/cvat-data.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].min.js',
        library: 'cvatData',
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
                        presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: '> 2.5%', // https://github.com/browserslist/browserslist
                                },
                            ],
                        ],
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
                        name: '[name].[contenthash].js',
                    },
                },
            },
            {
                test: /3rdparty\/.*\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/3rdparty/',
                        name: '3rdparty/[name].[contenthash].js',
                    },
                },
            },
        ],
    },
    plugins: [new CopyPlugin(['./src/js/3rdparty/avc.wasm'])],
};

module.exports = cvatData;
