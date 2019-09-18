/* global
    require:true,
    __dirname:true,
*/

const path = require('path');

const webConfig = {
    target: 'web',
    mode: 'production',
    entry: './src/js/cvat-data.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-data.min.js',
        library: 'cvatData',
        libraryTarget: 'window',
    },
    devtool: 'source-map',
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: false,
        inline: true,
        port: 3000,
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
};

const nodeConfig = {
    target: 'node',
    mode: 'development',
    devtool: 'source-map',
    entry: './src/js/cvat-data.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-data.node.js',
        library: 'cvatData',
        libraryTarget: 'commonjs',
    },
    stats: {
        warnings: false,
    },
};

module.exports = [webConfig, nodeConfig];
