// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';

import { requestPasswordResetAsync } from 'actions/auth-actions';
import { CombinedState } from 'reducers';
import SigningLayout from 'components/signing-common/signing-layout';
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
    const { fetching, onResetPassword } = props;

    return (
        <SigningLayout>
            <Col span={10}>
                <Row>
                    <Col span={18}>
                        <ResetPasswordForm
                            fetching={fetching}
                            onSubmit={(resetPasswordData: ResetPasswordData): void => {
                                onResetPassword(resetPasswordData.email);
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        </SigningLayout>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ResetPasswordPagePageComponent);
