// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useLocation } from 'react-router-dom';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import { LockOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';

import { validateConfirmation, validatePassword } from 'components/register-page/register-form';

export interface ResetPasswordConfirmData {
    newPassword1: string;
    newPassword2: string;
    uid: string;
    token: string;
}

interface Props {
    fetching: boolean;
    onSubmit(resetPasswordConfirmData: ResetPasswordConfirmData): void;
}

function ResetPasswordConfirmFormComponent({ fetching, onSubmit }: Props): JSX.Element {
    const location = useLocation();
    return (
        <Form
            onFinish={(values: Record<string, string>): void => {
                const params = new URLSearchParams(location.search);
                const uid = params.get('uid');
                const token = params.get('token');
                if (uid && token) {
                    onSubmit(({ ...values, uid, token } as ResetPasswordConfirmData));
                }
            }}
            className='cvat-reset-password-confirm-form'
        >
            <Form.Item
                hasFeedback
                name='newPassword1'
                rules={[
                    {
                        required: true,
                        message: '请输入新密码！',
                    }, validatePassword,
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='新密码'
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='newPassword2'
                dependencies={['newPassword1']}
                rules={[
                    {
                        required: true,
                        message: '请确认您的新密码！',
                    }, validateConfirmation('newPassword1'),
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='确认新密码'
                />
            </Form.Item>

            <Form.Item>
                <Button
                    type='primary'
                    htmlType='submit'
                    className='cvat-reset-password-confirm-form-button'
                    loading={fetching}
                    disabled={fetching}
                >
                    更改密码
                </Button>
            </Form.Item>
        </Form>
    );
}

export default React.memo(ResetPasswordConfirmFormComponent);



