// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';

import { UserAgreement } from 'reducers';
import SigningLayout, { formSizes } from 'components/signing-common/signing-layout';
import RegisterForm, { RegisterData } from './register-form';

interface RegisterPageComponentProps {
    fetching: boolean;
    userAgreements: UserAgreement[];
    onRegister: (
        registerData: RegisterData,
    ) => void;
    predefinedEmail?: string;
    hideLoginLink?: boolean;
}

function RegisterPageComponent(props: RegisterPageComponentProps & RouteComponentProps): JSX.Element {
    const {
        fetching, userAgreements, onRegister, predefinedEmail, hideLoginLink,
    } = props;

    return (
        <SigningLayout>
            <Col {...formSizes.wrapper}>
                <Row justify='center'>
                    <Col {...formSizes.form}>
                        <RegisterForm
                            fetching={fetching}
                            userAgreements={userAgreements}
                            predefinedEmail={predefinedEmail}
                            hideLoginLink={hideLoginLink}
                            onSubmit={(registerData: RegisterData): void => {
                                onRegister(registerData);
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        </SigningLayout>
    );
}

export default withRouter(RegisterPageComponent);
