// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';

import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
} from 'antd';

import RegisterForm, { RegisterData } from './register-form';

interface RegisterPageComponentProps {
    fetching: boolean;
    onRegister: (username: string, firstName: string,
        lastName: string, email: string,
        password1: string, password2: string) => void;
}

function RegisterPageComponent(
    props: RegisterPageComponentProps & RouteComponentProps,
): JSX.Element {
    const sizes = {
        xs: { span: 14 },
        sm: { span: 14 },
        md: { span: 10 },
        lg: { span: 4 },
        xl: { span: 4 },
    };

    const {
        fetching,
        onRegister,
    } = props;

    return (
        <Row type='flex' justify='center' align='middle'>
            <Col {...sizes}>
                <Title level={2}> Create an account </Title>
                <RegisterForm
                    fetching={fetching}
                    onSubmit={(registerData: RegisterData): void => {
                        onRegister(
                            registerData.username,
                            registerData.firstName,
                            registerData.lastName,
                            registerData.email,
                            registerData.password1,
                            registerData.password2,
                        );
                    }}
                />
                <Row type='flex' justify='start' align='top'>
                    <Col>
                        <Text strong>
                            Already have an account?
                            <Link to='/auth/login'> Login </Link>
                        </Text>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default withRouter(RegisterPageComponent);
