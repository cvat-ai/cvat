// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';

import SigningLayout, { formSizes } from 'components/signing-common/signing-layout';
import LoginForm, { LoginData } from './login-form';

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    renderRegistrationComponent: boolean;
    renderBasicLoginComponent: boolean;
    hasEmailVerificationBeenSent: boolean;
    onLogin: (credential: string, password: string) => void;
}

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    const history = useHistory();
    const {
        fetching, renderResetPassword, renderRegistrationComponent, renderBasicLoginComponent,
        hasEmailVerificationBeenSent, onLogin,
    } = props;

    if (hasEmailVerificationBeenSent) {
        history.push('/auth/email-verification-sent');
    }
    return (
        <SigningLayout>
            <Col {...formSizes.wrapper}>
                <Row justify='center'>
                    <Col {...formSizes.form}>
                        <LoginForm
                            fetching={fetching}
                            renderResetPassword={renderResetPassword}
                            renderRegistrationComponent={renderRegistrationComponent}
                            renderBasicLoginComponent={renderBasicLoginComponent}
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
