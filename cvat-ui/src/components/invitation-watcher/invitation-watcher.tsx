// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { CombinedState } from 'reducers';

function InvitationWatcher(): JSX.Element | null {
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
                localStorage.removeItem('newInvitation');
                history.push('/invitations');
            }
        }
    }, [user]);

    return null;
}

export default React.memo(InvitationWatcher);
