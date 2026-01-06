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
            message: '请输入名字',
            pattern: patterns.validateName.pattern,
        },
    ],

    lastName: [
        {
            required: true,
            message: '请输入姓氏',
            pattern: patterns.validateName.pattern,
        },
    ],

    email: [
        {
            type: 'email' as RuleType,
            message: '输入的邮箱格式不正确！',
        },
        {
            required: true,
            message: '请输入邮箱地址',
        },
    ],

    userName: [
        {
            required: true,
            message: '请输入用户名',
        },
        {
            validator: validateUsername,
        },
    ],
};

export default validationRules;

