// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { CombinedState } from 'reducers/interfaces';
import { resetPasswordConfirmAsync } from 'actions/auth-actions';

import ResetPasswordConfirmForm, { ResetPasswordConfirmData } from './reset-password-confirm-form';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    onResetPasswordConfirm: typeof resetPasswordConfirmAsync;
}

interface ResetPasswordConfirmPageComponentProps {
    fetching: boolean;
    onResetPasswordConfirm: (
        newPassword1: string,
        newPassword2: string,
        uid: string,
        token: string) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onResetPasswordConfirm: resetPasswordConfirmAsync,
};

function ResetPasswordPagePageComponent(
    props: ResetPasswordConfirmPageComponentProps,
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
        onResetPasswordConfirm,
    } = props;

    return (
        <>
            <Row type='flex' justify='center' align='middle'>
                <Col {...sizes}>
                    <Title level={2}> Change password </Title>
                    <ResetPasswordConfirmForm
                        fetching={fetching}
                        onSubmit={(resetPasswordConfirmData: ResetPasswordConfirmData): void => {
                            onResetPasswordConfirm(
                                resetPasswordConfirmData.newPassword1,
                                resetPasswordConfirmData.newPassword2,
                                resetPasswordConfirmData.uid,
                                resetPasswordConfirmData.token,
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
        </>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ResetPasswordPagePageComponent);
