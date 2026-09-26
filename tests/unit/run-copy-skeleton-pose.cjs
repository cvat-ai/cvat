// SPDX-License-Identifier: MIT

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const webpack = require('../../node_modules/webpack');
webpack({
    mode: 'development', target: 'node', devtool: false,
    entry: path.join(__dirname, 'copy-skeleton-pose.ts'),
    output: { path: path.join(__dirname, '../../node_modules/.cache/cvat-copy-pose-test'), filename: 'test.cjs' },
    resolve: { extensions: ['.ts', '.js', '.json'], modules: [path.join(__dirname, '../../node_modules')] },
    module: { rules: [{ test: /\.ts$/, use: {
        loader: path.join(__dirname, '../../node_modules/babel-loader'),
        options: { presets: [[require.resolve('../../node_modules/@babel/preset-typescript'), {}]] },
    } }] },
}, (error, stats) => {
    if (error || stats.hasErrors()) {
        console.error(error || stats.toString({ all: false, errors: true }));
        process.exitCode = 1;
        return;
    }
    const result = spawnSync(process.execPath, [path.join(__dirname, '../../node_modules/.cache/cvat-copy-pose-test/test.cjs')], { stdio: 'inherit' });
    process.exitCode = result.status ?? 1;
});
