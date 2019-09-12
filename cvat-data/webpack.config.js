const path = require('path');

module.exports = {
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
