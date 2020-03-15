/* global
    require:true,
    __dirname:true,
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
        rules: [{
            test: /.js?$/,
            exclude: /node_modules/,
        }],
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
        filename: 'cvat-core.min.js',
        library: 'cvat',
        libraryTarget: 'window',
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
                            targets: '> 2.5%', // https://github.com/browserslist/browserslist
                        }],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        }],
    },
};

module.exports = [nodeConfig, webConfig];
