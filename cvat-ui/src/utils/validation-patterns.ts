// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT


const validationPatterns = {
    validatePasswordLength: {
        pattern: /(?=.{8,})/,
        message: 'Password must have at least 8 characters',
    },

    passwordContainsNumericCharacters: {
        pattern: /(?=.*[0-9])/,
        message: 'Password must have at least 1 numeric characters',
    },

    passwordContainsUpperCaseCharacter: {
        pattern: /(?=.*[A-Z])/,
        message: 'Password must have at least 1 uppercase alphabetical character',
    },

    passwordContainsLowerCaseCharacter: {
        pattern: /(?=.*[a-z])/,
        message: 'Password must have at least 1 lowercase alphabetical character',
    },

    validateUsernameLength: {
        pattern: /(?=.{5,})/,
        message: 'Username must have at least 8 characters',
    },

    validateUsernameCharacters: {
        pattern: /^[a-zA-Z0-9_-]{5,}$/,
        message: 'Only characters (a-z), (A-Z), (0-9), -, _ are available',
    },

    validateName: {
        // eslint-disable-next-line
        pattern: /^[a-zA-Z]{2,}(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
        message: 'Invalid name',
    },

    validateAttributeName: {
        pattern: /\S+/,
        message: 'Invalid name',
    },

    validateLabelName: {
        pattern: /\S+/,
        message: 'Invalid name',
    },

    validateAttributeValue: {
        pattern: /\S+/,
        message: 'Invalid attribute value',
    },

    validateURL: {
        // eslint-disable-next-line
        pattern: /^((https?:\/\/)|(git@))[^\s$.?#].[^\s]*$/, // url, ssh url, ip
        message: 'URL is not valid',
    },

    validatePath: {
        // eslint-disable-next-line
        pattern: /^\[\/?([A-z0-9-_+]+\/)*([A-z0-9]+\.(xml|zip|json))\]$/,
        message: 'Git path is not valid',
    },
};

export default validationPatterns;
