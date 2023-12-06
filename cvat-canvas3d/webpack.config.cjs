// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BundleDeclarationsWebpackPlugin = require('bundle-declarations-webpack-plugin');

const styleLoaders = [
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
];

module.exports = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: {
        'cvat-canvas3d': './src/typescript/canvas3d.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].js',
        library: 'canvas3d',
        libraryTarget: 'window',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: ['@babel/plugin-proposal-class-properties'],
                        presets: ['@babel/preset-env', '@babel/typescript'],
                        sourceType: 'unambiguous',
                    },
                },
            },
            {
                test: /\.scss$/,
                exclude: /node_modules/,
                use: styleLoaders,
            },
        ],
    },
    plugins: [
        new BundleDeclarationsWebpackPlugin({
            outFile: "declaration/src/cvat-canvas.d.ts",
        }),
    ],
};
