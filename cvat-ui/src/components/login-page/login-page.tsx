// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Layout from 'antd/lib/layout';

import LoginForm, { LoginData } from './login-form';

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    onLogin: (credential: string, password: string) => void;
}

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    // const sizes = {
    //     style: {
    //         width: 400,
    //     },
    // };

    const { Content } = Layout;

    const { fetching, onLogin, renderResetPassword } = props;

    return (
        <Layout>
            <Content>
                {/* <Row style={{ height: '33%' }} /> */}
                <Row justify='center' align='middle' style={{ height: '100%' }}>
                    <Col span={12} className='cvat-login-title'>
                        <Title>Open Data</Title>
                        <Title>Annotation Platform</Title>
                    </Col>
                    <Col span={10}>
                        <Row>
                            <Col span={18}>
                                <LoginForm
                                    fetching={fetching}
                                    onSubmit={(loginData: LoginData): void => {
                                        onLogin(loginData.credential, loginData.password);
                                    }}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}

export default withRouter(LoginPageComponent);
