/* global
    require:true,
    __dirname:true
*/

const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: `${path.resolve(__dirname, 'babel.build')}/api.js`,
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'cvat.js',
    },
};
