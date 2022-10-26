// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Icon from '@ant-design/icons';
import {
    BackArrowIcon, ClearIcon, SocialGithubLogo, SocialGoogleLogo,
} from 'icons';
import { Col, Row } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Link } from 'react-router-dom';
import SocialAccountLink from 'components/signing-common/social-account-link';

export interface LoginData {
    credential: string;
    password: string;
}

interface Props {
    renderResetPassword: boolean;
    fetching: boolean;
    onSubmit(loginData: LoginData): void;
}

function LoginFormComponent(props: Props): JSX.Element {
    const { fetching, onSubmit, renderResetPassword } = props;
    const [form] = Form.useForm();
    const [credentialNonEmpty, setCredentialNonEmpty] = useState(false);
    return (
        <div className='cvat-signing-form-wrapper'>
            {
                credentialNonEmpty ? (
                    <Row justify='space-between' className='cvat-credentials-navigation'>
                        <Col>
                            <Icon
                                component={BackArrowIcon}
                                onClick={() => {
                                    setCredentialNonEmpty(false);
                                    form.setFieldsValue({ credential: '' });
                                }}
                            />
                        </Col>
                        {
                            renderResetPassword ? (
                                <Col className='cvat-credentials-link'>
                                    <Text strong>
                                        <Link to='/auth/password/reset'>Forgot password?</Link>
                                    </Text>
                                </Col>
                            ) : null
                        }
                    </Row>
                ) : null
            }
            <Row>
                <Col>
                    <Title level={2}> Sign in </Title>
                </Col>
            </Row>
            <Row>
                <Col className='cvat-credentials-link'>
                    <Text strong>
                        New user?&nbsp;
                        <Link to='/auth/register'>Create an account</Link>
                    </Text>
                </Col>
            </Row>
            <Form className={`cvat-signing-form ${credentialNonEmpty ? 'cvat-signing-form-extended' : ''}`} form={form}>
                <Form.Item
                    className='cvat-credentials-form-item'
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
                        placeholder='enter your email or username'
                        prefix={<Text>Email or username</Text>}
                        suffix={(
                            credentialNonEmpty ? (
                                <Icon
                                    component={ClearIcon}
                                    onClick={() => {
                                        form.setFieldsValue({ credential: '' });
                                    }}
                                />
                            ) : null
                        )}
                        onChange={(event) => {
                            const { value } = event.target;
                            setCredentialNonEmpty(!!value);
                        }}
                    />
                </Form.Item>
                {
                    credentialNonEmpty ? (
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
                                prefix={
                                    <Text>Password</Text>
                                }
                            />
                        </Form.Item>
                    ) : null
                }
            </Form>
            {
                credentialNonEmpty ? (
                    <Row>
                        <Col flex='auto'>
                            <Button
                                className='cvat-credentials-action-button'
                                loading={fetching}
                                onClick={async () => {
                                    const loginData: LoginData = await form.validateFields();
                                    onSubmit(loginData);
                                }}
                            >
                                Next
                            </Button>
                        </Col>
                    </Row>
                ) : (
                    <>
                        <SocialAccountLink icon={SocialGithubLogo}>
                            Continue with Github
                        </SocialAccountLink>
                        <SocialAccountLink icon={SocialGoogleLogo} className='cvat-social-authentication-google'>
                            Continue with Google
                        </SocialAccountLink>
                    </>
                )
            }
        </div>
    );
}

export default React.memo(LoginFormComponent);
