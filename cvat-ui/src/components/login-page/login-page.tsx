// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import { Row, Col } from 'antd/lib/grid';

import SigningLayout from 'components/signing-common/signing-layout';
import LoginForm, { LoginData } from './login-form';

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    onLogin: (credential: string, password: string) => void;
}

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    const { fetching, onLogin, renderResetPassword } = props;

    return (
        <SigningLayout>
            <Col span={12} className='cvat-signing-title'>
                <Title>Open Data</Title>
                <Title>Annotation Platform</Title>
            </Col>
            <Col span={10}>
                <Row>
                    <Col span={18}>
                        <LoginForm
                            fetching={fetching}
                            renderResetPassword={renderResetPassword}
                            onSubmit={(loginData: LoginData): void => {
                                onLogin(loginData.credential, loginData.password);
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        </SigningLayout>
    );
}

export default withRouter(LoginPageComponent);
