// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { requestPasswordResetAsync } from 'actions/auth-actions';
import { CombinedState } from 'reducers/interfaces';
import ResetPasswordForm, { ResetPasswordData } from './reset-password-form';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    onResetPassword: typeof requestPasswordResetAsync;
}

interface ResetPasswordPageComponentProps {
    fetching: boolean;
    onResetPassword: (email: string) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onResetPassword: requestPasswordResetAsync,
};

function ResetPasswordPagePageComponent(props: ResetPasswordPageComponentProps): JSX.Element {
    const sizes = {
        xs: { span: 14 },
        sm: { span: 14 },
        md: { span: 10 },
        lg: { span: 4 },
        xl: { span: 4 },
    };

    const { fetching, onResetPassword } = props;

    return (
        <Row type='flex' justify='center' align='middle'>
            <Col {...sizes}>
                <Title level={2}> Reset password </Title>
                <ResetPasswordForm
                    fetching={fetching}
                    onSubmit={(resetPasswordData: ResetPasswordData): void => {
                        onResetPassword(resetPasswordData.email);
                    }}
                />
                <Row type='flex' justify='start' align='top'>
                    <Col>
                        <Text strong>
                            Go to
                            <Link to='/auth/login'> login page </Link>
                        </Text>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ResetPasswordPagePageComponent);
