// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, ThunkAction, createAction } from 'utils/redux';
import { Invitation, getCore } from 'cvat-core-wrapper';

const core = getCore();

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

export function getInvitationsAsync(userID: number): ThunkAction {
    return async function (dispatch) {
        dispatch(invitationActions.getInvitations());

        try {
            const invitations = await core.organizations.invitation({
                filter: `{"and":[{"==":[{"var":"user_id"},"${userID}"]}, {"==":[{"var":"accepted"},false]}]}`,
            });
            dispatch(invitationActions.getInvitationsSuccess(invitations));
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(invitationActions.getInvitationsFailed(error.toString()));
            } else {
                dispatch(invitationActions.getInvitationsFailed('Unknown error'));
            }
        }
    };
}
