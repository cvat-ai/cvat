// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { RuleObject } from 'antd/lib/form';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RuleType } from 'rc-field-form/lib/interface';

import patterns from './validation-patterns';

export function validateUsername(_: RuleObject, value: string): Promise<void> {
    if (!patterns.validateUsernameLength.pattern.test(value)) {
        return Promise.reject(new Error(patterns.validateUsernameLength.message));
    }

    if (!patterns.validateUsernameCharacters.pattern.test(value)) {
        return Promise.reject(new Error(patterns.validateUsernameCharacters.message));
    }

    return Promise.resolve();
}

const validationRules = {
    firstName: [
        {
            required: true,
            message: 'Please specify a first name',
            pattern: patterns.validateName.pattern,
        },
    ],

    lastName: [
        {
            required: true,
            message: 'Please specify a last name',
            pattern: patterns.validateName.pattern,
        },
    ],

    email: [
        {
            type: 'email' as RuleType,
            message: 'The input is not valid E-mail!',
        },
        {
            required: true,
            message: 'Please specify an email address',
        },
    ],

    userName: [
        {
            required: true,
            message: 'Please specify a username',
        },
        {
            validator: validateUsername,
        },
    ],
};

export default validationRules;
