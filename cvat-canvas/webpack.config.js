/* global
    require:true,
    __dirname:true,
*/

const path = require('path');

module.exports = {
    devtool: 'source-map',
    entry: './src/main.ts',
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        inline: true,
        port: 9000,
    },
    module: {
        rules: [{
            test: /.ts?$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        [
                            '@babel/preset-env',
                        ], [
                            '@babel/typescript',
                        ],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        }],
    },
};
