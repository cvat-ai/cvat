// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import Title from 'antd/lib/typography/Title';
import { Row, Col } from 'antd/lib/grid';
import Layout from 'antd/lib/layout';

import { CombinedState } from 'reducers';
import { resetPasswordAsync } from 'actions/auth-actions';
import ResetPasswordConfirmForm, { ResetPasswordConfirmData } from './reset-password-confirm-form';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    onResetPasswordConfirm: typeof resetPasswordAsync;
}

interface ResetPasswordConfirmPageComponentProps {
    fetching: boolean;
    onResetPasswordConfirm: (newPassword1: string, newPassword2: string, uid: string, token: string) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onResetPasswordConfirm: resetPasswordAsync,
};

function ResetPasswordPagePageComponent(props: ResetPasswordConfirmPageComponentProps): JSX.Element {
    const sizes = {
        xs: { span: 14 },
        sm: { span: 14 },
        md: { span: 10 },
        lg: { span: 4 },
        xl: { span: 4 },
    };

    const { fetching, onResetPasswordConfirm } = props;

    const { Content } = Layout;

    return (
        <Layout>
            <Content>
                <Row justify='center' align='middle' style={{ height: '100%' }}>
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
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ResetPasswordPagePageComponent);
