// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';

import { selectIdPAsync, loadSocialAuthAsync } from 'actions/auth-actions';
import { CombinedState } from 'reducers';
import SigningLayout, { formSizes } from 'components/signing-common/signing-layout';
import LoginWithSSOForm from './login-with-sso-form';

import { getCore } from '../../cvat-core-wrapper';

const core = getCore();

function LoginWithSSOComponent(): JSX.Element {
    const dispatch = useDispatch();
    const fetching = useSelector((state: CombinedState) => state.auth.ssoIDPSelectFetching);
    const isIdPSelected = useSelector((state: CombinedState) => state.auth.ssoIDPSelected);
    const selectedIdP = useSelector((state: CombinedState) => state.auth.ssoIDP);
    const [SSOConfiguration] = useSelector((state: CombinedState) => state.auth.socialAuthMethods.filter(
        (item) => item.provider === 'sso',
    ));

    useEffect(() => {
        dispatch(loadSocialAuthAsync());
    }, []);

    useEffect(() => {
        if (selectedIdP) {
            const ssoAnchor = window.document.getElementById('ssoLoginAnchor');
            if (ssoAnchor) {
                (ssoAnchor as HTMLAnchorElement).href = `${core.config.backendAPI}/auth/sso/${selectedIdP}/login/`;
                (ssoAnchor as HTMLAnchorElement).click();
            }
        }
    }, [selectedIdP]);

    useEffect(() => {
        if (SSOConfiguration?.selectionSchema === 'lowest_weight') {
            dispatch(selectIdPAsync());
        }
    }, [SSOConfiguration?.selectionSchema]);

    if (
        (!fetching && !isIdPSelected && SSOConfiguration?.selectionSchema === 'email_address') ||
        (isIdPSelected && !selectedIdP)
    ) {
        return (
            <SigningLayout>
                <Col {...formSizes.wrapper}>
                    <Row justify='center'>
                        <Col {...formSizes.form}>
                            <LoginWithSSOForm
                                fetching={fetching}
                                onSubmit={(email: string): void => {
                                    dispatch(selectIdPAsync(email));
                                }}
                            />
                        </Col>
                    </Row>
                </Col>
            </SigningLayout>
        );
    }
    return (
        <>
            {/* eslint-disable-next-line */}
            <a id='ssoLoginAnchor' style={{ display: 'none' }} />
            <div className='cvat-login-page cvat-spinner-container'>
                <Spin size='large' className='cvat-spinner' />
            </div>
        </>
    );
}

export default React.memo(LoginWithSSOComponent);
