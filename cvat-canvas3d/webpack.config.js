// Copyright (C) 2021-2022 Intel Corporation
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
            plugins: [require('postcss-preset-env')],
        },
    },
    'sass-loader',
];

const nodeConfig = {
    target: 'node',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/typescript/canvas3d.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-canvas3d.node.js',
        library: 'canvas3d',
        libraryTarget: 'commonjs',
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
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-optional-chaining',
                        ],
                        presets: [['@babel/preset-env', { targets: 'node > 10' }], '@babel/typescript'],
                        sourceType: 'unambiguous',
                    },
                },
            },
            {
                test: /\.(css|scss)$/,
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

const webConfig = {
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

module.exports = [webConfig, nodeConfig];
