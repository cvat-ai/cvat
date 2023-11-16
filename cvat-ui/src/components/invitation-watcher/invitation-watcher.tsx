// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';
import { useHistory } from 'react-router';
import { Invitation, Organization, getCore } from 'cvat-core-wrapper';
import { acceptInvitationAsync, rejectInvitationAsync } from 'actions/auth-actions';
import Modal from 'antd/lib/modal';

const core = getCore();

function InvitationWatcher(): JSX.Element {
    const user = useSelector((state: CombinedState) => state.auth.user);
    const history = useHistory();
    const dispatch = useDispatch();

    useEffect(() => {
        const queryParams = new URLSearchParams(history.location.search);
        const invitation = queryParams.get('invitation');

        if (invitation) {
            const storedInvitations = localStorage.getItem('invitations') || '[]';
            const invitations = JSON.parse(storedInvitations);
            if (!invitations.includes(invitation)) {
                invitations.push(invitation);
                localStorage.setItem('invitations', JSON.stringify(invitations));
            }
        }

        if (user) {
            const storedInvitations = localStorage.getItem('invitations') || '[]';
            const invitations = JSON.parse(storedInvitations);

            const checkRequests = invitations.map(
                (invitationKey: string) => core.organizations.invitation(invitationKey),
            );
            Promise.allSettled(checkRequests).then((promises) => {
                // TODO check that error is shown if promise rejected
                const validInvitations = promises
                    .map((promise) => (promise.status === 'fulfilled' ? promise.value : null))
                    .filter((invitation) => !!invitation);
                // TODO show error for each expired;
                const expiredInvitations = validInvitations.filter((invitation) => invitation.expired);

                const invitationsToBeShown = validInvitations.filter((invitation) => !invitation.expired);
                if (invitationsToBeShown.length === 0) {
                    localStorage.removeItem('invitations');
                }
                invitationsToBeShown.forEach((invitation: Invitation, index) => {
                    const slug = invitation.organization instanceof Organization ? invitation.organization.slug : '';
                    Modal.confirm({
                        title: `You\\'ve been invited to an organization ${slug} by ${invitation.owner?.username}`,
                        content: 'Do you want to join?',
                        className: 'cvat-invitaion-confirm-modal',
                        onOk: () => {
                            dispatch(acceptInvitationAsync(invitation.key, (orgSlug) => {
                                localStorage.setItem('currentOrganization', orgSlug);
                            }));
                            if (index === invitationsToBeShown.length - 1) {
                                window.location.reload();
                                localStorage.removeItem('invitations');
                            }
                        },
                        onCancel: () => {
                            dispatch(rejectInvitationAsync(invitation.key));
                            if (index === invitationsToBeShown.length - 1) {
                                window.location.reload();
                                localStorage.removeItem('invitations');
                            }
                        },
                    });
                });
            });
        }
    }, [user]);

    return <></>;
}

export default React.memo(InvitationWatcher);
