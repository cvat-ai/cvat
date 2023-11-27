// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { useHistory } from 'react-router';

function InvitationWatcher(): JSX.Element {
    const user = useSelector((state: CombinedState) => state.auth.user);
    const history = useHistory();

    useEffect(() => {
        const queryParams = new URLSearchParams(history.location.search);
        const invitationKey = queryParams.get('invitation');

        if (invitationKey) {
            localStorage.setItem('newInvitation', invitationKey);
        }

        if (user && user.isVerified) {
            const newInvitation = localStorage.getItem('newInvitation') || null;
            if (newInvitation) {
                history.push('/invitations');
            }
        }
    }, [user]);

    return <></>;
}

export default React.memo(InvitationWatcher);
