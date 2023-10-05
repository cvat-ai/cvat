// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import RegisterPageComponent from 'components/register-page/register-page';
import { CombinedState } from 'reducers';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { acceptInvitationAsync } from 'actions/auth-actions';
import { RegisterData } from 'components/register-page/register-form';

interface InvitationParams {
    email: string;
    key: string;
}

function AcceptInvitationPage(): JSX.Element {
    const userAgreements = useSelector((state: CombinedState) => state.userAgreements.list);
    const userAgreementsFetching = useSelector((state: CombinedState) => state.userAgreements.fetching);
    const authFetching = useSelector((state: CombinedState) => state.auth.fetching);
    const history = useHistory();
    const dispatch = useDispatch();
    const queryParams = new URLSearchParams(history.location.search);
    const invitationParams: InvitationParams = {
        email: queryParams.get('email') || '',
        key: queryParams.get('key') || '',
    };
    const onRegister = useCallback((registerData: RegisterData) => {
        dispatch(acceptInvitationAsync(
            registerData,
            invitationParams.key,
            (orgSlug: string) => {
                localStorage.setItem('currentOrganization', orgSlug);
                history.replace('/auth/login?next=/tasks');
            },
        ));
    }, [dispatch]);

    return (
        <RegisterPageComponent
            onRegister={onRegister}
            userAgreements={userAgreements}
            fetching={userAgreementsFetching || authFetching}
            predefinedEmail={invitationParams.email}
            hideLoginLink
        />
    );
}

export default React.memo(AcceptInvitationPage);
