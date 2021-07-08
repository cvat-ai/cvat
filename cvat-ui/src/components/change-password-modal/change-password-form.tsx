// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form from 'antd/lib/form';
import { LockOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';

import { validateConfirmation, validatePassword } from 'components/register-page/register-form';

export interface ChangePasswordData {
    oldPassword: string;
    newPassword1: string;
    newPassword2: string;
}

interface Props {
    fetching: boolean;
    onSubmit(loginData: ChangePasswordData): void;
}

function ChangePasswordFormComponent({ fetching, onSubmit }: Props): JSX.Element {
    return (
        <Form onFinish={onSubmit} className='change-password-form'>
            <Form.Item
                hasFeedback
                name='oldPassword'
                rules={[
                    {
                        required: true,
                        message: 'Please input your current password!',
                    },
                ]}
            >
                <Input.Password
                    autoComplete='current-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='Current password'
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='newPassword1'
                rules={[
                    {
                        required: true,
                        message: 'Please input new password!',
                    },
                    validatePassword,
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='New password'
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='newPassword2'
                dependencies={['newPassword1']}
                rules={[
                    {
                        required: true,
                        message: 'Please confirm your new password!',
                    },
                    validateConfirmation('newPassword1'),
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='Confirm new password'
                />
            </Form.Item>

            <Form.Item>
                <Button
                    type='primary'
                    htmlType='submit'
                    className='change-password-form-button'
                    loading={fetching}
                    disabled={fetching}
                >
                    Submit
                </Button>
            </Form.Item>
        </Form>
    );
}

export default React.memo(ChangePasswordFormComponent);
