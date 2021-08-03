// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

module.exports = {
    parser: false,
    plugins: {
        'postcss-preset-env': {
            browsers: 'Chrome >= 63, Firefox > 58, not IE 11, > 2%', // https://browserslist.dev
        },
    },
};
