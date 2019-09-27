const path = require('path');


const _module = {
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
    }

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
    module: _module
};


const workerImg = {
    target: 'web',
    mode: 'production',
    entry: './src/js/unzip_imgs.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'unzip_imgs.js',      
    },
    module: _module
}

const workerVideo = {
    target: 'web',
    mode: 'production',
    entry: './src/js/decode_video.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'decode_video.js',      
    },
    module: _module
}

module.exports = [cvatData, workerImg, workerVideo]