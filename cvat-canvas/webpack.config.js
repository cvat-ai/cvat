/* eslint-disable */
const path = require('path');
const DtsBundleWebpack = require('dts-bundle-webpack')

const nodeConfig = {
    target: 'node',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/canvas.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-canvas.node.js',
        library: 'canvas',
        libraryTarget: 'commonjs',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        alias: {
            // CUSTOM PACKAGES:
           'cvat-canvas.node': path.resolve(__dirname, 'dist/cvat-canvas.node.js'),
        }
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
        }],
    },
    plugins: [
        new DtsBundleWebpack({
            name: 'cvat-canvas.node',
            main: 'dist/declarations/canvas.d.ts',
            out: '../cvat-canvas.node.d.ts',
        }),
    ]
};

const webConfig = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/canvas.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-canvas.js',
        library: 'canvas',
    },
    devServer: {
        contentBase: path.join(__dirname, 'public'),
        compress: false,
        inline: true,
        port: 3000,
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        alias: {
            // CUSTOM PACKAGES:
           'cvat-canvas.node': path.resolve(__dirname, 'dist/cvat-canvas.node.js'),
        },
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
        }],
    },
    plugins: [
        new DtsBundleWebpack({
            name: 'cvat-canvas',
            main: 'dist/declarations/canvas.d.ts',
            out: '../cvat-canvas.d.ts',
        }),
    ]
};

module.exports = [webConfig, nodeConfig]
