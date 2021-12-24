// Copyright (C) 2020-2021 Intel Corporation
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

import { UserAgreement } from 'reducers/interfaces';
import FooterDrawer from 'components/login-page/intel-footer-drawer';
import RegisterForm, { RegisterData, UserConfirmation } from './register-form';

interface RegisterPageComponentProps {
    fetching: boolean;
    userAgreements: UserAgreement[];
    onRegister: (
        username: string,
        firstName: string,
        lastName: string,
        email: string,
        password1: string,
        password2: string,
        confirmations: UserConfirmation[],
    ) => void;
}

function RegisterPageComponent(props: RegisterPageComponentProps & RouteComponentProps): JSX.Element {
    const sizes = {
        style: {
            width: 400,
        },
    };

    const { fetching, userAgreements, onRegister } = props;
    const { Content } = Layout;

    return (
        <Layout>
            <Content>
                <Row justify='center' align='middle' style={{ height: '100%' }}>
                    <Col {...sizes}>
                        <Title level={2}> Create an account </Title>
                        <RegisterForm
                            fetching={fetching}
                            userAgreements={userAgreements}
                            onSubmit={(registerData: RegisterData): void => {
                                onRegister(
                                    registerData.username,
                                    registerData.firstName,
                                    registerData.lastName,
                                    registerData.email,
                                    registerData.password1,
                                    registerData.password2,
                                    registerData.confirmations,
                                );
                            }}
                        />
                        <Row justify='start' align='top'>
                            <Col>
                                <Text strong>
                                    Already have an account?
                                    <Link to='/auth/login'> Login </Link>
                                </Text>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Content>
            <FooterDrawer />
        </Layout>
    );
}

export default withRouter(RegisterPageComponent);
