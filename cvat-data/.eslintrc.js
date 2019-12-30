/*
* Copyright (C) 2018 Intel Corporation
*
* SPDX-License-Identifier: MIT
*/

module.exports = {
    "env": {
        "node": false,
        "browser": true,
        "es6": true,
    },
    "parserOptions": {
        "parser": "babel-eslint",
        "sourceType": "module",
        "ecmaVersion": 2018,
    },
    "plugins": [
        "security",
        "no-unsanitized",
        "no-unsafe-innerhtml",
    ],
    "extends": [
        "eslint:recommended",
        "plugin:security/recommended",
        "plugin:no-unsanitized/DOM",
        "airbnb-base",
    ],
    "rules": {
        "indent": ["warn", 4],
        "no-underscore-dangle": ["error", { "allowAfterThis": true }],
        "no-plusplus": [0],
        "no-bitwise": [0],
        "security/detect-object-injection": [0],
    },
    'settings': {
        'import/resolver': {
            'node': {
                'extensions': ['.tsx', '.ts', '.jsx', '.js', '.json'],
            },
        },
    },
};
