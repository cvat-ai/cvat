// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    parser: false,
    plugins: {
        'postcss-preset-env': {
            browsers: '> 2.5%', // https://github.com/browserslist/browserslist
        },
    },
};
