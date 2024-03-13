// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import { Col, Row } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import Icon from '@ant-design/icons';
import {
    BackArrowIcon, ClearIcon,
} from 'icons';

import CVATSigningInput, { CVATInputType } from 'components/signing-common/cvat-signing-input';
import { CombinedState } from 'reducers';
import { useAuthQuery, usePlugins } from 'utils/hooks';

export interface LoginData {
    credential: string;
    password: string;
}

interface Props {
    renderResetPassword: boolean;
    renderRegistrationComponent: boolean;
    renderBasicLoginComponent: boolean;
    fetching: boolean;
    onSubmit(loginData: LoginData): void;
}

function LoginFormComponent(props: Props): JSX.Element {
    const {
        fetching, onSubmit, renderResetPassword, renderRegistrationComponent, renderBasicLoginComponent,
    } = props;

    const authQuery = useAuthQuery();
    const [form] = Form.useForm();
    const [credential, setCredential] = useState('');
    const pluginsToRender = usePlugins(
        (state: CombinedState) => state.plugins.components.loginPage.loginForm,
        props,
        { credential },
    );

    let resetSearch = authQuery ? new URLSearchParams(authQuery).toString() : '';
    if (credential.includes('@')) {
        const updatedAuthQuery = authQuery ? { ...authQuery, email: credential } : { email: credential };
        resetSearch = new URLSearchParams(updatedAuthQuery).toString();
    }

    const forgotPasswordLink = (
        <Col className='cvat-credentials-link'>
            <Text strong>
                <Link to={{ pathname: '/auth/password/reset', search: resetSearch }}>
                    Forgot password?
                </Link>
            </Text>
        </Col>
    );

    return (
        <div className='cvat-login-form-wrapper'>
            <Row justify='space-between' className='cvat-credentials-navigation'>
                {
                    credential && (
                        <Col>
                            <Icon
                                component={BackArrowIcon}
                                onClick={() => {
                                    setCredential('');
                                    form.setFieldsValue({ credential: '' });
                                }}
                            />
                        </Col>
                    )
                }
                {
                    !credential && renderRegistrationComponent && (
                        <Row>
                            <Col className='cvat-credentials-link'>
                                <Text strong>
                                    New user?&nbsp;
                                    <Link to={{
                                        pathname: '/auth/register',
                                        search: authQuery ? new URLSearchParams(authQuery).toString() : '',
                                    }}
                                    >
                                        Create an account
                                    </Link>
                                </Text>
                            </Col>
                        </Row>
                    )
                }
                {
                    renderResetPassword && forgotPasswordLink
                }
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
                {renderBasicLoginComponent && (
                    <>
                        <Form.Item
                            className='cvat-credentials-form-item'
                            name='credential'
                        >
                            <Input
                                autoComplete='credential'
                                prefix={<Text>Email or username</Text>}
                                className={credential ? 'cvat-input-floating-label-above' : 'cvat-input-floating-label'}
                                suffix={credential && (
                                    <Icon
                                        component={ClearIcon}
                                        onClick={() => {
                                            setCredential('');
                                            form.setFieldsValue({ credential: '', password: '' });
                                        }}
                                    />
                                )}
                                onChange={(event) => {
                                    const { value } = event.target;
                                    setCredential(value);
                                    if (!value) form.setFieldsValue({ credential: '', password: '' });
                                }}
                            />
                        </Form.Item>
                        {
                            credential && (
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
                                    <CVATSigningInput
                                        type={CVATInputType.PASSWORD}
                                        id='password'
                                        placeholder='Password'
                                        autoComplete='password'
                                    />
                                </Form.Item>
                            )
                        }
                        {
                            !!credential && (
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
                            )
                        }
                    </>
                )}
                {
                    pluginsToRender.map(({ component: Component }, index) => (
                        <Component targetProps={props} targetState={{ credential }} key={index} />
                    ))
                }
            </Form>
        </div>
    );
}

export default React.memo(LoginFormComponent);
