// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* global
    __dirname:true
*/

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: {
        'cvat-ui': './src/index.tsx',
    },
    stats: {
        children: true,
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].min.js',
        publicPath: '/',
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: false,
        inline: true,
        port: 3000,
        historyApiFallback: true,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
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
                        presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: '> 2.5%', // https://github.com/browserslist/browserslist
                                },
                            ],
                            ['@babel/preset-react'],
                            ['@babel/typescript'],
                        ],
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
                    'postcss-loader',
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
                test: /3rdparty\/.*\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/',
                        filename: '3rdparty/[name].[contenthash].js',
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
                    },
                },
            },
        ],
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
                    from: '../cvat-data/src/js/3rdparty/avc.wasm',
                    to: '3rdparty/',
                },
            ],
        }),
    ],
};
