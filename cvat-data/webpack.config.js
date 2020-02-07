/* global
    require:true,
    __dirname:true,
*/

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const moduleConf = {
    rules: [
        {
            test: /.js?$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env', {
                            targets: '> 2.5%',
                        }],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        },
    ],
};

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
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: false,
        inline: true,
        port: 3001,
    },
    module: moduleConf,
};

const workerImg = {
    target: 'web',
    mode: 'production',
    entry: './src/js/unzip_imgs.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'unzip_imgs.js',
    },
    module: moduleConf,
};

const workerVideo = {
    target: 'web',
    mode: 'production',
    entry: './src/js/3rdparty/Decoder.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'Decoder.js',
    },
    module: moduleConf,
    plugins: [
        new CopyPlugin([
            './src/js/3rdparty/avc.wasm',
        ]),
    ],
};

module.exports = [cvatData, workerImg, workerVideo];
