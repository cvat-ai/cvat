// Copyright (C) 2020 Intel Corporation
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
                        message: 'Please input new password!',
                    }, validatePassword,
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
                    }, validateConfirmation('newPassword1'),
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
                    className='cvat-reset-password-confirm-form-button'
                    loading={fetching}
                    disabled={fetching}
                >
                    Change password
                </Button>
            </Form.Item>
        </Form>
    );
}

export default React.memo(ResetPasswordConfirmFormComponent);
