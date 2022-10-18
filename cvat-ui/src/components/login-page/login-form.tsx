// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

export interface LoginData {
    credential: string;
    password: string;
}

interface Props {
    fetching: boolean;
    onSubmit(loginData: LoginData): void;
}

function LoginFormComponent(props: Props): JSX.Element {
    const { fetching, onSubmit } = props;
    return (
        <Form onFinish={onSubmit} className='login-form'>
            <Form.Item
                hasFeedback
                name='credential'
                rules={[
                    {
                        required: true,
                        message: 'Please specify a email or username',
                    },
                ]}
            >
                <Input
                    autoComplete='credential'
                    prefix={<UserOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='Email or Username'
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='password'
                rules={[
                    {
                        required: true,
                        message: 'Please specify a password',
                    },
                ]}
            >
                <Input
                    autoComplete='current-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='Password'
                    type='password'
                />
            </Form.Item>

            <Form.Item>
                <Button
                    type='primary'
                    loading={fetching}
                    disabled={fetching}
                    htmlType='submit'
                    className='login-form-button'
                >
                    Sign in
                </Button>
            </Form.Item>
        </Form>
    );
}

export default React.memo(LoginFormComponent);
