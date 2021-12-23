// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import {
    Button,
    Divider,
    Layout,
    Space,
} from 'antd';

import FooterDrawer from 'components/login-page/intel-footer-drawer';

import { OpenVINOIcon, CVATLogo } from 'icons';
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
                <Row style={{ height: '33%' }} />
                <Row justify='center' align='middle'>
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
                <Row justify='center'>
                    <Space direction='vertical' size='large'>
                        <Row justify='center'>
                            <Col>
                                <Divider />
                                CVAT is developed as part of OpenVINO Toolkit ecosystem
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Space size='large'>
                                    <Button
                                        href='https://openvinotoolkit.github.io/cvat/docs'
                                        icon={<CVATLogo />}
                                        block
                                        type='link'
                                        target='_blank'
                                    />
                                    <Button
                                        href='https://docs.openvino.ai/latest/index.html'
                                        icon={<OpenVINOIcon />}
                                        block
                                        type='link'
                                        target='_blank'
                                    />
                                </Space>
                            </Col>
                        </Row>
                    </Space>
                </Row>
            </Content>
            <FooterDrawer />
        </Layout>
    );
}

export default withRouter(LoginPageComponent);
