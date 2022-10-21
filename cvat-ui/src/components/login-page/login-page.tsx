// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import { Link, withRouter } from 'react-router-dom';
import Button from 'antd/lib/button';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Layout from 'antd/lib/layout';
import Space from 'antd/lib/space';
import { GithubOutlined, GooglePlusOutlined } from '@ant-design/icons';

import LoginForm, { LoginData } from './login-form';
import { getCore } from '../../cvat-core-wrapper';

const cvat = getCore();

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    hasEmailVerificationBeenSent: boolean;
    onLogin: (credential: string, password: string) => void;
}

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    const history = useHistory();
    const { backendAPI } = cvat.config;
    const sizes = {
        style: {
            width: 400,
        },
    };

    const { Content } = Layout;

    const {
        fetching, onLogin, renderResetPassword, hasEmailVerificationBeenSent,
    } = props;

    if (hasEmailVerificationBeenSent) {
        history.push('/auth/email-verification-sent');
    }

    return (
        <Layout>
            <Content>
                <Row style={{ height: '33%' }} />
                <Row justify='center' align='middle'>
                    <Col {...sizes}>
                        <Title level={2}> Login </Title>
                        <LoginForm
                            fetching={fetching}
                            onSubmit={(loginData: LoginData): void => {
                                onLogin(loginData.credential, loginData.password);
                            }}
                        />
                        <Row justify='center' align='top'>
                            <Col>
                                or
                            </Col>
                        </Row>
                        <Row justify='space-between' align='middle'>
                            <Col span={11}>
                                <Button href={`${backendAPI}/auth/google/login`}>
                                    <Space>
                                        <GooglePlusOutlined />
                                        Continue with Google
                                    </Space>
                                </Button>
                            </Col>
                            <Col span={11} offset={1}>
                                <Button href={`${backendAPI}/auth/github/login`}>
                                    <Space>
                                        <GithubOutlined />
                                        Continue with Github
                                    </Space>
                                </Button>
                            </Col>
                        </Row>
                        <Row justify='start' align='top'>
                            <Col>
                                <Text strong>
                                    New to CVAT? Create
                                    <Link to='/auth/register'> an account</Link>
                                </Text>
                            </Col>
                        </Row>
                        {renderResetPassword && (
                            <Row justify='start' align='top'>
                                <Col>
                                    <Text strong>
                                        <Link to='/auth/password/reset'>Forgot your password?</Link>
                                    </Text>
                                </Col>
                            </Row>
                        )}
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}

export default withRouter(LoginPageComponent);
