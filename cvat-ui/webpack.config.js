// Copyright (C) 2020-2022 Intel Corporation
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

module.exports = (env) => ({
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: {
        'cvat-ui': './src/index.tsx',
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
        proxy: [
            {
                context: (param) =>
                    param.match(
                        /\/api\/.*|git\/.*|opencv\/.*|analytics\/.*|static\/.*|admin(?:\/(.*))?.*|documentation\/.*|django-rq(?:\/(.*))?/gm,
                    ),
                target: env && env.API_URL,
                secure: false,
                changeOrigin: true,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
        fallback: {
            fs: false,
        },
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
                            plugins: [require('postcss-preset-env')],
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
                test: /3rdparty\/.*\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/',
                        filename: 'assets/3rdparty/[name].[contenthash].js',
                        esModule: false,
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
                        filename: 'assets/[name].[contenthash].js',
                        esModule: false,
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
                    from: '../cvat-data/src/ts/3rdparty/avc.wasm',
                    to: 'assets/3rdparty/',
                },
            ],
        }),
    ],
});
