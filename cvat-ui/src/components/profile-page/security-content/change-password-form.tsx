// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Form from 'antd/lib/form';
import { LockOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import { Row } from 'antd/lib/grid';

import { ChangePasswordData } from 'reducers';
import { validateConfirmation, validatePassword } from 'components/register-page/register-form';

interface Props {
    onSubmit(loginData: ChangePasswordData): void;
    onCancel(): void;
}

function ChangePasswordFormComponent({ onSubmit, onCancel }: Props): JSX.Element {
    return (
        <Form onFinish={onSubmit} className='cvat-change-password-form'>
            <Form.Item
                hasFeedback
                name='oldPassword'
                rules={[
                    {
                        required: true,
                        message: '请输入当前密码！',
                    },
                ]}
            >
                <Input.Password
                    autoComplete='current-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='当前密码'
                />
            </Form.Item>

            <Form.Item
                hasFeedback
                name='newPassword1'
                rules={[
                    {
                        required: true,
                        message: '请输入新密码！',
                    },
                    validatePassword,
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
                        message: '请确认新密码！',
                    },
                    validateConfirmation('newPassword1'),
                ]}
            >
                <Input.Password
                    autoComplete='new-password'
                    prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                    placeholder='确认新密码'
                />
            </Form.Item>

            <Form.Item>
                <Row justify='end'>
                    <Button
                        className='cvat-change-password-cancel-button'
                        onClick={onCancel}
                    >
                        取消
                    </Button>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='cvat-change-password-form-button'
                    >
                        提交
                    </Button>
                </Row>
            </Form.Item>
        </Form>
    );
}

export default React.memo(ChangePasswordFormComponent);


