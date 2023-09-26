// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import RegisterPageComponent from 'components/register-page/register-page';
import { CombinedState } from 'reducers';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router';

interface InvitationParams {
    email: string;
    key: string;
}

function AcceptInvitationPage(): JSX.Element {
    const userAgreements = useSelector((state: CombinedState) => state.userAgreements.list);
    const userAgreementsFetching = useSelector((state: CombinedState) => state.userAgreements.fetching);
    const authFetching = useSelector((state: CombinedState) => state.auth.fetching);

    const invitationParams = useParams<InvitationParams>();
    console.log(invitationParams);
    const onRegister = () => {
        console.log('register');
    };

    return (
        <RegisterPageComponent
            onRegister={onRegister}
            userAgreements={userAgreements}
            fetching={userAgreementsFetching || authFetching}
        />
    );
}

export default React.memo(AcceptInvitationPage);
