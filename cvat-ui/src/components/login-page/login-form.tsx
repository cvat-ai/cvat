// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef, useState } from 'react';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Icon from '@ant-design/icons';
import { BackArrowIcon, ClearIcon } from 'icons';
import { Col, Row } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Link } from 'react-router-dom';

export interface LoginData {
    credential: string;
    password: string;
}

interface Props {
    renderResetPassword: boolean;
    fetching: boolean;
    socialAuthentication: JSX.Element | null;
    onSubmit(loginData: LoginData): void;
}

function LoginFormComponent(props: Props): JSX.Element {
    const {
        fetching, onSubmit, renderResetPassword, socialAuthentication,
    } = props;
    const [form] = Form.useForm();
    const [credential, setCredential] = useState(false);
    const mail = useRef<string>('');

    const inputReset = useCallback(
        (name: string): void => {
            form.setFieldsValue({ [name]: '' });
        },
        [form],
    );

    const forgotPasswordLink = (
        <Col className='cvat-credentials-link'>
            <Text strong>
                <nav>
                    <Link
                        to='/auth/password/reset'
                        onClick={() => {
                            if (mail.current) sessionStorage.setItem('mail', mail.current);
                        }}
                    >
                        Forgot password?
                    </Link>
                </nav>
            </Text>
        </Col>
    );
    return (
        <div className='cvat-login-form-wrapper'>
            <Row justify='space-between' className='cvat-credentials-navigation'>
                {credential && (
                    <Col>
                        <Icon
                            component={BackArrowIcon}
                            onClick={() => {
                                setCredential(false);
                                form.setFieldsValue({ credential: '' });
                            }}
                        />
                    </Col>
                )}
                {!credential && (
                    <Row>
                        <Col className='cvat-credentials-link'>
                            <Text strong>
                                New user?&nbsp;
                                <Link to='/auth/register'>Create an account</Link>
                            </Text>
                        </Col>
                    </Row>
                )}
                {renderResetPassword && forgotPasswordLink}
            </Row>
            <Col>
                <Title level={2}> Sign in </Title>
            </Col>
            <Form
                className={`cvat-login-form ${credential ? 'cvat-login-form-extended' : ''}`}
                form={form}
                onFinish={(loginData: LoginData) => {
                    onSubmit(loginData);
                }}
            >
                <Form.Item className='cvat-credentials-form-item' name='credential'>
                    <Input
                        autoComplete='credential'
                        placeholder='enter your email or username'
                        prefix={<Text>Email or username</Text>}
                        suffix={
                            credential && (
                                <Icon
                                    component={ClearIcon}
                                    onClick={() => {
                                        setCredential(false);
                                        inputReset('credential');
                                    }}
                                />
                            )
                        }
                        onChange={(event) => {
                            const { value } = event.target;
                            setCredential(!!value);
                            mail.current = value.includes('@') ? value : '';
                            if (!value) inputReset('credential');
                        }}
                    />
                </Form.Item>
                {credential && (
                    <Form.Item
                        className='cvat-credentials-form-item'
                        name='password'
                        rules={[
                            {
                                required: true,
                                message: 'Please specify a password',
                            },
                        ]}
                    >
                        <Input.Password
                            autoComplete='current-password'
                            placeholder='enter your password'
                            prefix={<Text>Password</Text>}
                        />
                    </Form.Item>
                )}
                {credential || !socialAuthentication ? (
                    <Form.Item>
                        <Button
                            className='cvat-credentials-action-button'
                            loading={fetching}
                            disabled={!credential}
                            htmlType='submit'
                        >
                            Next
                        </Button>
                    </Form.Item>
                ) : (
                    socialAuthentication
                )}
            </Form>
        </div>
    );
}

export default React.memo(LoginFormComponent);
