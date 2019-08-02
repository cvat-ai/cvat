/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

 module.exports = {
    "env": {
        "node": true,
        "browser": true,
        "es6": true,
    },
    "parserOptions": {
        "parser": "@typescript-eslint/parser",
        "sourceType": "module",
        "ecmaVersion": 6,
    },
    "plugins": [
        "security",
        "no-unsanitized",
        "no-unsafe-innerhtml",
        "@typescript-eslint",
    ],
    "extends": [
        "eslint:recommended",
        "plugin:security/recommended",
        "plugin:no-unsanitized/DOM",
        "plugin:@typescript-eslint/recommended",
        "airbnb",
    ],
    "rules": {
        "no-new": [0],
        "class-methods-use-this": [0],
        "no-plusplus": [0],
        "no-restricted-syntax": [0, {"selector": "ForOfStatement"}],
        "no-continue": [0],
        "security/detect-object-injection": 0,
        "indent": ["warn", 4],
        "no-useless-constructor": 0,
        "func-names": [0],
        "no-console": [0], // this rule deprecates console.log, console.warn etc. because "it is not good in production code"
        "@typescript-eslint/no-explicit-any": [0],
    },
};
