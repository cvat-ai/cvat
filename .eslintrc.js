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
        "jquery": true,
        "qunit": true,
    },
    "parserOptions": {
        "sourceType": "script",
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
        "no-await-in-loop": [0],
        "global-require": [0],
        "no-new": [0],
        "class-methods-use-this": [0],
        "no-restricted-properties": [0, {
            "object": "Math",
            "property": "pow",
        }],
        "no-param-reassign": [0],
        "no-underscore-dangle": ["error", { "allowAfterThis": true }],
        "no-restricted-syntax": [0, {"selector": "ForOfStatement"}],
        "no-continue": [0],
        "no-unsafe-innerhtml/no-unsafe-innerhtml": 1,
        // This rule actual for user input data on the node.js environment mainly.
        "security/detect-object-injection": 0,
        "indent": ["warn", 4],
        // recently added to airbnb
        "max-classes-per-file": [0],
        // it was opposite before and our code has been written according to previous rule
        "arrow-parens": [0],
        // object spread is a modern ECMA standard. Let's do not use it without babel
        "prefer-object-spread": [0],
    },
};
