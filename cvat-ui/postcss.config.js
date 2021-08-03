// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
module.exports = {
    parser: false,
    plugins: {
        'postcss-preset-env': {
            browsers: 'Chrome >= 63, Firefox > 63, not IE 11, > 2%', // https://browserslist.dev
        },
    },
};
