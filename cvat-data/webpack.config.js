/* global
    require:true,
    __dirname:true,
*/

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const cvatData = {
    target: 'web',
    mode: 'production',
    entry: './src/js/cvat-data.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat-data.min.js',
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
                            ['@babel/preset-env', {
                                targets: '> 2.5%', // https://github.com/browserslist/browserslist
                            }],
                        ],
                        sourceType: 'unambiguous',
                    },
                },
            }, {
                test: /\.worker\.js$/,
                exclude: /3rdparty/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/',
                        name: '[name].js',
                    },
                },
            }, {
                test: /3rdparty\/.*\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        publicPath: '/3rdparty/',
                        name: '3rdparty/[name].js',
                    },
                },
            },
        ],
    },
    plugins: [
        new CopyPlugin([
            './src/js/3rdparty/avc.wasm',
        ]),
    ],
};

module.exports = cvatData;
