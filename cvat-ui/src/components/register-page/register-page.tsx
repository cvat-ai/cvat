// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';

import { UserAgreement } from 'reducers';
import SigningLayout from 'components/signing-common/signing-layout';
import RegisterForm, { RegisterData, UserConfirmation } from './register-form';

interface RegisterPageComponentProps {
    fetching: boolean;
    userAgreements: UserAgreement[];
    onRegister: (
        username: string,
        firstName: string,
        lastName: string,
        email: string,
        password: string,
        confirmations: UserConfirmation[],
    ) => void;
}

function RegisterPageComponent(props: RegisterPageComponentProps & RouteComponentProps): JSX.Element {
    const { fetching, userAgreements, onRegister } = props;

    return (
        <SigningLayout>
            <Col span={10}>
                <Row>
                    <Col span={18}>
                        <RegisterForm
                            fetching={fetching}
                            userAgreements={userAgreements}
                            onSubmit={(registerData: RegisterData): void => {
                                onRegister(
                                    registerData.username,
                                    registerData.firstName,
                                    registerData.lastName,
                                    registerData.email,
                                    registerData.password,
                                    registerData.confirmations,
                                );
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        </SigningLayout>
    );
}

export default withRouter(RegisterPageComponent);
