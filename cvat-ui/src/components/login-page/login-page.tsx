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
import SocialAccountCard from 'components/signing-common/social-account-card';

import { getCore, SocialAuthMethods, SocialAuthMethod } from 'cvat-core-wrapper';
import config from 'config';
import LoginForm, { LoginData } from './login-form';

const cvat = getCore();

interface LoginPageComponentProps {
    fetching: boolean;
    renderResetPassword: boolean;
    hasEmailVerificationBeenSent: boolean;
    socialAuthMethods: SocialAuthMethods;
    onLogin: (credential: string, password: string) => void;
    loadSocialAuthenticationMethods: () => void;
    loadSSOConfiguration: () => void;
}

const renderSocialAuthMethods = (methods: SocialAuthMethods): JSX.Element | JSX.Element[] => {
    const { backendAPI } = cvat.config;
    const activeMethods = methods.filter((item: SocialAuthMethod) => item.isEnabled);

    if (activeMethods.length > 2) {
        const numberPerRow = 4;
        const map: SocialAuthMethod[][] = [];

        activeMethods.forEach((el) => {
            if (!map.length || map[map.length - 1].length === numberPerRow) {
                map.push([el]);
            } else {
                map[map.length - 1].push(el);
            }
        });

        return (
            <>
                {map.map((item: SocialAuthMethods, idx): JSX.Element => (
                    <Row
                        gutter={[4, 4]}
                        align='middle'
                        justify='space-between'
                        key={idx}
                        className='cvat-social-authentication-row-with-icons'
                    >
                        {item.map((method: SocialAuthMethod) => (
                            <Col span={6} key={method.provider} style={{ display: 'flex' }}>
                                <SocialAccountCard
                                    key={method.provider}
                                    icon={method.icon}
                                    href={(method.provider !== config.SSO_PROVIDER_KEY) ? `${backendAPI}/auth/social/${method.provider}/login/` : '/auth/sso/select-identity-provider/'}
                                    className={`cvat-social-authentication-${method.provider}`}
                                >
                                    {`Continue with ${method.publicName}`}
                                </SocialAccountCard>
                            </Col>
                        ))}
                    </Row>
                ))}
            </>
        );
    }

    return methods.map((item: SocialAuthMethod) => ((item.isEnabled) ? (
        <SocialAccountLink
            key={item.provider}
            icon={item.icon}
            href={(item.provider !== config.SSO_PROVIDER_KEY) ? `${backendAPI}/auth/social/${item.provider}/login/` : '/auth/sso/select-identity-provider/'}
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
