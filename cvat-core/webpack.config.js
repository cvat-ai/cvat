/* global
    require:true,
    __dirname:true,
*/

const path = require('path');
const webpack = require('webpack');


const nodeConfig = {
    target: 'node',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/api.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat.node.js',
    },
    module: {
        rules: [{
            test: /.js?$/,
            exclude: /node_modules/,
        }],
    },
    externals: {
        canvas: 'commonjs canvas',
    },
    stats: {
        warnings: false,
    },
};

const webConfig = {
    target: 'web',
    mode: 'production',
    devtool: 'source-map',
    entry: './src/api.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat.js',
    },
    module: {
        rules: [{
            test: /.js?$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env', {
                            targets: {
                                chrome: 58,
                            },
                            useBuiltIns: 'usage',
                            corejs: 3,
                            loose: false,
                            spec: false,
                            debug: false,
                            include: [],
                            exclude: [],
                        }],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        }],
    },
    plugins: [
        new webpack.IgnorePlugin(/browser-env/),
    ],
};

module.exports = [nodeConfig, webConfig];
