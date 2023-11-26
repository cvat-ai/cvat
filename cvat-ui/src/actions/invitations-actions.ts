// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';
import { Invitation, getCore } from 'cvat-core-wrapper';

const cvat = getCore();

export enum InvitationsActionTypes {
    GET_INVITATIONS = 'GET_INVITATIONS',
    GET_INVITATIONS_SUCCESS = 'GET_INVITATIONS_SUCCESS',
    GET_INVITATIONS_FAILED = 'GET_INVITATIONS_FAILED',
}

const invitationActions = {
    getInvitations: () => createAction(InvitationsActionTypes.GET_INVITATIONS),
    getInvitationsSuccess: (invitations: Invitation[]) => (
        createAction(InvitationsActionTypes.GET_INVITATIONS_SUCCESS, { invitations })
    ),
    getInvitationsFailed: (error: any) => createAction(InvitationsActionTypes.GET_INVITATIONS_FAILED, { error }),
};

export type InvitationActions = ActionUnion<typeof invitationActions>;
