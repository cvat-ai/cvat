// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback } from 'react';
import RegisterPageComponent from 'components/register-page/register-page';
import { CombinedState } from 'reducers';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { acceptInvitationAsync } from 'actions/auth-actions';
import { RegisterData } from 'components/register-page/register-form';

interface InvitationParams {
    email: string | null;
    key: string | null;
}

function AcceptInvitationPage(): JSX.Element {
    const userAgreements = useSelector((state: CombinedState) => state.userAgreements.list);
    const userAgreementsFetching = useSelector((state: CombinedState) => state.userAgreements.fetching);
    const authFetching = useSelector((state: CombinedState) => state.auth.fetching);
    const history = useHistory();
    const dispatch = useDispatch();
    const queryParams = new URLSearchParams(history.location.search);
    // TODO: add check for inv params
    const invitationParams: InvitationParams = {
        email: queryParams.get('email'),
        key: queryParams.get('key'),
    };
    const onRegister = useCallback((registerData: RegisterData) => {
        dispatch(acceptInvitationAsync(
            registerData,
            invitationParams.key,
            (orgSlug: string) => {
                history.replace(`/auth/login?next=/tasks&activateOrganization=${orgSlug}`);
            },
        ));
    }, [dispatch]);

    return (
        <RegisterPageComponent
            onRegister={onRegister}
            userAgreements={userAgreements}
            fetching={userAgreementsFetching || authFetching}
            predifinedEmail={invitationParams.email}
            disableNavigation
        />
    );
}

export default React.memo(AcceptInvitationPage);
