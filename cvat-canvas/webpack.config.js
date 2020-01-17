/*
 * Copyright (C) 2019 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

/* eslint-disable */
const path = require('path');
const DtsBundleWebpack = require('dts-bundle-webpack')

const nodeConfig = {
    target: 'node',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/typescript/canvas.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-canvas.node.js',
        library: 'canvas',
        libraryTarget: 'commonjs',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    module: {
        rules: [{
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env'],
                        ['@babel/typescript'],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        }, {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }],
    },
    plugins: [
        new DtsBundleWebpack({
            name: 'cvat-canvas.node',
            main: 'dist/declaration/canvas.d.ts',
            out: '../cvat-canvas.node.d.ts',
        }),
    ]
};

const webConfig = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/typescript/canvas.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-canvas.js',
        library: 'canvas',
        libraryTarget: 'window',
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: false,
        inline: true,
        port: 3000,
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    module: {
        rules: [{
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env', {
                            targets: '> 2.5%', // https://github.com/browserslist/browserslist
                        }],
                        ['@babel/typescript'],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        }, {
            test: /\.scss$/,
            exclude: /node_modules/,
            use: ['style-loader', {
                loader: 'css-loader',
                options: {
                    importLoaders: 2,
                },
            }, 'postcss-loader', 'sass-loader']
        }],
    },
    plugins: [
        new DtsBundleWebpack({
            name: 'cvat-canvas',
            main: 'dist/declaration/canvas.d.ts',
            out: '../cvat-canvas.d.ts',
        }),
    ]
};

module.exports = [webConfig, nodeConfig]
