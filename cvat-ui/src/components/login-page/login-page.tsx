// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import { Layout } from 'antd';

import FooterDrawer from 'components/login-page/intel-footer-drawer';

import LoginForm, { LoginData } from './login-form';

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    onLogin: (username: string, password: string) => void;
}

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    const sizes = {
        xs: { span: 14 },
        sm: { span: 14 },
        md: { span: 10 },
        lg: { span: 4 },
        xl: { span: 4 },
    };

    const { Content } = Layout;

    const { fetching, onLogin, renderResetPassword } = props;

    return (
        <Layout>
            <Content>
                <Row justify='center' align='middle' style={{ height: '100%' }}>
                    <Col {...sizes}>
                        <Title level={2}> Login </Title>
                        <LoginForm
                            fetching={fetching}
                            onSubmit={(loginData: LoginData): void => {
                                onLogin(loginData.username, loginData.password);
                            }}
                        />
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
            <FooterDrawer />
        </Layout>
    );
}

export default withRouter(LoginPageComponent);
