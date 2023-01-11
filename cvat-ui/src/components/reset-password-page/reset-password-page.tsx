// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';

import { requestPasswordResetAsync } from 'actions/auth-actions';
import { CombinedState } from 'reducers';
import SigningLayout, { formSizes } from 'components/signing-common/signing-layout';
import ResetPasswordForm, { ResetPasswordData } from './reset-password-form';

function ResetPasswordPagePageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const fetching = useSelector((state: CombinedState) => state.auth.fetching);

    return (
        <SigningLayout>
            <Col {...formSizes.wrapper}>
                <Row justify='center'>
                    <Col {...formSizes.form}>
                        <ResetPasswordForm
                            fetching={fetching}
                            onSubmit={(resetPasswordData: ResetPasswordData): void => {
                                dispatch(requestPasswordResetAsync(resetPasswordData.email));
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        </SigningLayout>
    );
}

export default React.memo(ResetPasswordPagePageComponent);
