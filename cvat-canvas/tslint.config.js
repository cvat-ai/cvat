/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* eslint-disable */

module.exports = {
    defaultSeverity: 'error',
    extends: [
        'tslint:recommended',
        'tslint-config-airbnb'
    ],
    jsRules: {},
    rulesDirectory: [],
    rules: {
        'ter-indent': ['warn', 4],
        // TypeScript guildline prevents interfaces names started with I
        // https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines#names
        'interface-name': false,
        'no-console': false,
        // Arrow functions doesn't use closure context, but sometimes we need it
        // At the same time typescript non-arrow functions are forbidden in TS
        // So, we forced to disable this rule
        'no-this-assignment': false,
        // Just a strange rule
        'no-shadowed-variable': false,
        // Don't prevent ++ and -- operations (the same like in eslint)
        'no-increment-decrement': false,
    },
    linterOptions: {
        include: ['src/*.ts']
    }
}
