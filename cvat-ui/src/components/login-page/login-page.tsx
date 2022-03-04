// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Divider from 'antd/lib/divider';
import Layout from 'antd/lib/layout';

import FooterDrawer from 'components/login-page/intel-footer-drawer';

import consts from 'consts';
import { OpenVINOIcon } from 'icons';
import LoginForm, { LoginData } from './login-form';

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    onLogin: (username: string, password: string) => void;
}

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    const sizes = {
        style: {
            width: 400,
        },
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
                <Row className='cvat-login-openvino-block' justify='center'>
                    <Col {...sizes}>
                        <Divider />
                        <Text type='secondary'>
                            Learn more about products of
                            {/* It is important to keep the referer header here */}
                            {/* eslint-disable-next-line react/jsx-no-target-blank */}
                            <a target='_blank' rel='noopener' href={consts.OPENVINO_URL}> OpenVINO™ Toolkit </a>
                        </Text>
                        <Button
                            href={consts.OPENVINO_URL}
                            icon={<OpenVINOIcon />}
                            block
                            type='link'
                            target='_blank'
                        />
                    </Col>
                </Row>
            </Content>
            <FooterDrawer />
        </Layout>
    );
}

export default withRouter(LoginPageComponent);
