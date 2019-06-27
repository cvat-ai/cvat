/* global
    require:true,
    __dirname:true,
*/

const path = require('path');
const webpack = require('webpack');

const configuration = 'production';
const target = 'web';
const plugins = [];

if (configuration === 'production' && target === 'web') {
    plugins.push(
        /**
         * IgnorePlugin will skip any require
         * that matches the following regex.
         */
        new webpack.IgnorePlugin(/browser-env/),
    );
}

module.exports = {
    mode: configuration,
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
    plugins,
    target,
};
