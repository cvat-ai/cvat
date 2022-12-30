// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';

import SigningLayout, { formSizes } from 'components/signing-common/signing-layout';
import SocialAccountLink from 'components/signing-common/social-account-link';
import LoginForm, { LoginData } from './login-form';
import { getCore, SocialAuthMethods, SocialAuthMethod } from '../../cvat-core-wrapper';

const cvat = getCore();

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    hasEmailVerificationBeenSent: boolean;
    socialAuthMethods: SocialAuthMethods;
    onLogin: (credential: string, password: string) => void;
    loadSocialAuthenticationMethods: () => void;
}

const renderSocialAuthMethods = (methods: SocialAuthMethods): JSX.Element[] => {
    const { backendAPI } = cvat.config;

    return methods.map((item: SocialAuthMethod) => ((item.isEnabled) ? (
        <SocialAccountLink
            key={item.provider}
            icon={item.icon}
            href={`${backendAPI}/auth/${item.provider}/login`}
            className={`cvat-social-authentication-${item.provider}`}
        >
            {`Continue with ${item.publicName}`}
        </SocialAccountLink>
    ) : <></>));
};

function LoginPageComponent(props: LoginPageComponentProps & RouteComponentProps): JSX.Element {
    const history = useHistory();
    const {
        fetching, renderResetPassword, hasEmailVerificationBeenSent,
        socialAuthMethods, onLogin, loadSocialAuthenticationMethods,
    } = props;

    if (hasEmailVerificationBeenSent) {
        history.push('/auth/email-verification-sent');
    }

    useEffect(() => {
        loadSocialAuthenticationMethods();
    }, []);

    return (
        <SigningLayout>
            <Col {...formSizes.wrapper}>
                <Row justify='center'>
                    <Col {...formSizes.form}>
                        <LoginForm
                            fetching={fetching}
                            renderResetPassword={renderResetPassword}
                            socialAuthentication={(socialAuthMethods) ? (
                                <div className='cvat-social-authentication'>
                                    {renderSocialAuthMethods(socialAuthMethods)}
                                </div>
                            ) : null}
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
