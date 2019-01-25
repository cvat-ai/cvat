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
        "airbnb",
    ],
    "rules": {
        "no-unsafe-innerhtml/no-unsafe-innerhtml": 1,
        // This rule actual for user input data on the node.js environment mainly.
        "security/detect-object-injection": 0,
        "indent": ["warn", 4],
    },
};
