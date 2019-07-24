/* global
    require:true,
    __dirname:true,
*/

const path = require('path');

module.exports = {
    devtool: 'source-map',
    entry: './src/canvas.js',
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        inline: true,
        port: 9000,
    },
    module: {
        rules: [{
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        [
                            '@babel/preset-env',
                        ],
                    ],
                    sourceType: 'unambiguous',
                },
            },
        }],
    },
};
